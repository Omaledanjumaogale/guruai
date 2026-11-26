import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorize, isSuperAdmin, rateLimit, resolveSession } from "./authz";
import { pushNotification } from "./notify";

/** Ensure the configured super admin is a staff participant on a conversation. */
async function staffParticipant(ctx: any, conversationId: any) {
	const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
	if (!email) return null;
	const admin = await ctx.db.query("users").withIndex("by_email", (q: any) => q.eq("email", email)).first();
	if (!admin) return null;
	const existing = await ctx.db
		.query("conversationParticipants")
		.withIndex("by_conversation", (q: any) => q.eq("conversationId", conversationId))
		.collect();
	if (!existing.some((p: any) => p.userId === admin._id)) {
		await ctx.db.insert("conversationParticipants", {
			conversationId,
			userId: admin._id,
			role: "staff",
			lastReadAt: 0
		});
	}
	return admin;
}

/** Start (or continue) a private conversation with the Guru AI team. */
export const start = mutation({
	args: { token: v.string(), subject: v.string(), body: v.string() },
	handler: async (ctx, { token, subject, body }) => {
		const caller = await authorize(ctx, token, "messages.create");
		await rateLimit(ctx, `conversation:${caller.user._id}`, 4, 60 * 60 * 1000);
		const cleanSubject = subject.trim().slice(0, 120);
		const cleanBody = body.trim().slice(0, 4000);
		if (cleanSubject.length < 3) throw new ConvexError("Add a short subject (at least 3 characters).");
		if (cleanBody.length < 5) throw new ConvexError("Add a message so the team can help.");
		const now = Date.now();
		const conversationId = await ctx.db.insert("conversations", {
			subject: cleanSubject,
			createdBy: caller.user._id,
			status: "open",
			participantIds: [caller.user._id],
			messageCount: 1,
			lastMessageAt: now,
			createdAt: now
		});
		await ctx.db.insert("conversationParticipants", {
			conversationId,
			userId: caller.user._id,
			role: "owner",
			lastReadAt: now
		});
		const staff = await staffParticipant(ctx, conversationId);
		await ctx.db.insert("dmMessages", {
			conversationId,
			senderId: caller.user._id,
			senderLabel: caller.user.name ?? caller.user.email,
			body: cleanBody,
			createdAt: now
		});
		if (staff) {
			await pushNotification(ctx, {
				userId: staff._id,
				kind: "message",
				title: `New message: ${cleanSubject}`,
				body: `${caller.user.name ?? caller.user.email}: ${cleanBody.slice(0, 160)}`,
				href: `/admin?tab=messages&conversation=${conversationId}`
			});
		}
		return { conversationId };
	}
});

/** Conversations the caller participates in, newest first. */
export const listMine = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return [];
		const parts = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.collect();
		const rows = await Promise.all(
			parts.slice(0, 40).map(async (p) => {
				const conversation = await ctx.db.get(p.conversationId);
				if (!conversation) return null;
				const last = await ctx.db
					.query("dmMessages")
					.withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
					.order("desc")
					.first();
				return {
					_id: conversation._id,
					subject: conversation.subject,
					status: conversation.status,
					lastMessageAt: conversation.lastMessageAt,
					messageCount: conversation.messageCount,
					preview: last?.body.slice(0, 140) ?? "",
					previewFrom: last?.senderLabel ?? "",
					unread: conversation.lastMessageAt > p.lastReadAt
				};
			})
		);
		return rows.filter(Boolean).sort((a: any, b: any) => b.lastMessageAt - a.lastMessageAt);
	}
});

/** One thread, readable only by its participants (or a message manager). */
export const thread = query({
	args: { token: v.string(), conversationId: v.id("conversations") },
	handler: async (ctx, { token, conversationId }) => {
		const caller = await authorize(ctx, token, "messages.read.participant");
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) return null;
		const staff = caller.permissions.includes("messages.manage");
		if (!staff && !conversation.participantIds.includes(caller.user._id)) {
			throw new ConvexError("That conversation is not yours to read.");
		}
		const messages = await ctx.db
			.query("dmMessages")
			.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
			.order("asc")
			.take(200);
		return {
			conversation: {
				_id: conversation._id,
				subject: conversation.subject,
				status: conversation.status,
				createdAt: conversation.createdAt,
				participantIds: conversation.participantIds
			},
			messages,
			meId: caller.user._id,
			staff
		};
	}
});

/** Send a message in a conversation the caller belongs to. */
export const send = mutation({
	args: { token: v.string(), conversationId: v.id("conversations"), body: v.string() },
	handler: async (ctx, { token, conversationId, body }) => {
		const caller = await authorize(ctx, token, "messages.read.participant");
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) throw new ConvexError("That conversation no longer exists.");
		const staff = caller.permissions.includes("messages.manage");
		if (!staff && !conversation.participantIds.includes(caller.user._id)) {
			throw new ConvexError("You can only reply in your own conversations.");
		}
		if (conversation.status === "closed") throw new ConvexError("This conversation is closed. Start a new one to continue.");
		const clean = body.trim().slice(0, 4000);
		if (!clean) throw new ConvexError("Write a message first.");
		await rateLimit(ctx, `message:${caller.user._id}`, 30, 5 * 60 * 1000);
		const now = Date.now();
		await ctx.db.insert("dmMessages", {
			conversationId,
			senderId: caller.user._id,
			senderLabel: caller.user.name ?? caller.user.email,
			body: clean,
			createdAt: now
		});
		await ctx.db.patch(conversationId, {
			lastMessageAt: now,
			messageCount: conversation.messageCount + 1,
			status: "open"
		});
		const parts = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
			.collect();
		for (const p of parts) {
			if (p.userId === caller.user._id) {
				await ctx.db.patch(p._id, { lastReadAt: now });
				continue;
			}
			await pushNotification(ctx, {
				userId: p.userId,
				kind: "message",
				title: `Reply: ${conversation.subject}`,
				body: `${caller.user.name ?? caller.user.email}: ${clean.slice(0, 160)}`,
				href: p.role === "staff" ? `/admin?tab=messages&conversation=${conversationId}` : "/inbox"
			});
		}
		return { ok: true, at: now };
	}
});

export const markRead = mutation({
	args: { token: v.string(), conversationId: v.id("conversations") },
	handler: async (ctx, { token, conversationId }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return false;
		const p = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
			.collect();
		const mine = p.find((row) => row.userId === caller.user._id);
		if (mine) await ctx.db.patch(mine._id, { lastReadAt: Date.now() });
		return Boolean(mine);
	}
});

export const close = mutation({
	args: { token: v.string(), conversationId: v.id("conversations") },
	handler: async (ctx, { token, conversationId }) => {
		const caller = await authorize(ctx, token, "messages.read.participant");
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) throw new ConvexError("That conversation no longer exists.");
		const staff = caller.permissions.includes("messages.manage");
		if (!staff && conversation.createdBy !== caller.user._id) {
			throw new ConvexError("Only the person who opened this conversation can close it.");
		}
		await ctx.db.patch(conversationId, { status: "closed" });
		return { ok: true };
	}
});

/** Staff inbox: every conversation with requester details (messages.manage). */
export const inbox = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		await authorize(ctx, token, "messages.manage");
		const rows = await ctx.db.query("conversations").order("desc").take(100);
		const enriched = await Promise.all(
			rows.map(async (c) => {
				const user = await ctx.db.get(c.createdBy);
				return {
					_id: c._id,
					subject: c.subject,
					status: c.status,
					lastMessageAt: c.lastMessageAt,
					messageCount: c.messageCount,
					email: user?.email ?? "removed",
					name: user?.name ?? null
				};
			})
		);
		return enriched;
	}
});

/** Administrators can join a conversation to reply directly. */
export const join = mutation({
	args: { token: v.string(), conversationId: v.id("conversations") },
	handler: async (ctx, { token, conversationId }) => {
		const caller = await authorize(ctx, token, "messages.manage");
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) throw new ConvexError("That conversation no longer exists.");
		const parts = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
			.collect();
		if (!parts.some((p) => p.userId === caller.user._id)) {
			await ctx.db.insert("conversationParticipants", {
				conversationId,
				userId: caller.user._id,
				role: "staff",
				lastReadAt: 0
			});
			await ctx.db.patch(conversationId, { participantIds: [...conversation.participantIds, caller.user._id] });
		}
		return { ok: true };
	}
});

/** Unread conversation count for the shell badge. */
export const unread = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return 0;
		const parts = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.collect();
		let count = 0;
		for (const p of parts) {
			const c = await ctx.db.get(p.conversationId);
			if (c && c.lastMessageAt > p.lastReadAt) count++;
		}
		return count;
	}
});