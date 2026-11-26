import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorize, isSuperAdmin, rateLimit, resolveSession } from "./authz";
import { pushNotification } from "./notify";
import { record } from "./audit";

const DEFAULT_PREFS = { product: true, security: true, broadcast: true, message: true, emailDigest: false };

/** In-app notifications for the signed-in member. */
export const list = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await authorize(ctx, token, "notifications.read.self");
		const rows = await ctx.db
			.query("notifications")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.order("desc")
			.take(40);
		return { rows, unread: rows.filter((n) => !n.readAt).length };
	}
});

export const markRead = mutation({
	args: { token: v.string(), id: v.optional(v.id("notifications")), all: v.optional(v.boolean()) },
	handler: async (ctx, { token, id, all }) => {
		const caller = await authorize(ctx, token, "notifications.read.self");
		if (id) {
			const row = await ctx.db.get(id);
			if (!row || row.userId !== caller.user._id) throw new ConvexError("That notification is not yours.");
			if (!row.readAt) await ctx.db.patch(id, { readAt: Date.now() });
			return { updated: 1 };
		}
		const rows = await ctx.db
			.query("notifications")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.order("desc")
			.take(all ? 200 : 40);
		let updated = 0;
		for (const row of rows) {
			if (!row.readAt) {
				await ctx.db.patch(row._id, { readAt: Date.now() });
				updated++;
			}
		}
		return { updated };
	}
});

/** Stored preferences, with explicit defaults so the UI can render immediately. */
export const prefs = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		const stored = await ctx.db.query("notificationPrefs").withIndex("by_user", (q) => q.eq("userId", caller.user._id)).first();
		return { ...DEFAULT_PREFS, ...(stored ?? {}), saved: Boolean(stored) };
	}
});

export const setPrefs = mutation({
	args: {
		token: v.string(),
		product: v.boolean(),
		security: v.boolean(),
		broadcast: v.boolean(),
		message: v.boolean(),
		emailDigest: v.boolean()
	},
	handler: async (ctx, args) => {
		const caller = await authorize(ctx, args.token, "notifications.manage_preferences");
		const stored = await ctx.db.query("notificationPrefs").withIndex("by_user", (q) => q.eq("userId", caller.user._id)).first();
		const patch = {
			product: args.product,
			security: args.security,
			broadcast: args.broadcast,
			message: args.message,
			emailDigest: args.emailDigest,
			updatedAt: Date.now()
		};
		if (stored) await ctx.db.patch(stored._id, patch);
		else await ctx.db.insert("notificationPrefs", { userId: caller.user._id, ...patch });
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "notifications.preferences_updated",
			targetType: "user",
			targetId: String(caller.user._id),
			detail: JSON.stringify(patch)
		});
		return { ok: true };
	}
});

async function deliver(ctx: any, broadcast: any) {
	const audience = broadcast.audience;
	let recipients: any[] = [];
	if (audience.startsWith("plan:")) {
		const planKey = audience.slice(5);
		const subs = await ctx.db.query("subscriptions").withIndex("by_status", (q: any) => q.eq("status", "active")).take(500);
		for (const sub of subs.filter((s: any) => s.planKey === planKey)) {
			const user = await ctx.db.get(sub.userId);
			if (user) recipients.push(user);
		}
	} else {
		const users = await ctx.db.query("users").take(500);
		recipients = users.filter((u: any) => {
			if (u.status === "suspended" || u.status === "deleted") return false;
			if (audience === "admins") return u.role === "admin" || isSuperAdmin(u.email);
			if (audience === "members") return u.role === "member";
			return true;
		});
	}
	const seen = new Set<string>();
	let delivered = 0;
	let suppressed = 0;
	for (const user of recipients) {
		if (seen.has(String(user._id))) continue;
		seen.add(String(user._id));
		const id = await pushNotification(ctx, {
			userId: user._id,
			kind: "broadcast",
			title: broadcast.title,
			body: broadcast.body,
			href: "/notifications"
		});
		await ctx.db.insert("broadcastDeliveries", {
			broadcastId: broadcast._id,
			userId: user._id,
			channel: "in_app",
			status: id ? "delivered" : "suppressed",
			at: Date.now()
		});
		if (id) delivered++;
		else suppressed++;
	}
	return { delivered, suppressed, total: seen.size };
}

/** Announcement queue (admin.broadcasts.read). */
export const broadcasts = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		await authorize(ctx, token, "admin.broadcasts.read");
		const rows = await ctx.db.query("broadcasts").order("desc").take(60);
		return rows;
	}
});

/** Draft an announcement. Nothing is delivered until a reviewer approves it. */
export const createBroadcast = mutation({
	args: { token: v.string(), title: v.string(), body: v.string(), audience: v.string() },
	handler: async (ctx, { token, title, body, audience }) => {
		const caller = await authorize(ctx, token, "admin.broadcasts.create");
		await rateLimit(ctx, `broadcast:${caller.user._id}`, 10, 60 * 60 * 1000);
		const cleanTitle = title.trim().slice(0, 120);
		const cleanBody = body.trim().slice(0, 2000);
		if (cleanTitle.length < 4) throw new ConvexError("Give the announcement a clear title.");
		if (cleanBody.length < 10) throw new ConvexError("Write the announcement body (at least 10 characters).");
		if (!["everyone", "members", "admins"].includes(audience) && !audience.startsWith("plan:")) {
			throw new ConvexError("Choose a valid audience.");
		}
		const id = await ctx.db.insert("broadcasts", {
			title: cleanTitle,
			body: cleanBody,
			audience,
			status: "pending_review",
			createdBy: caller.user._id,
			createdByEmail: caller.user.email,
			createdAt: Date.now()
		});
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "broadcast.drafted",
			targetType: "broadcast",
			targetId: String(id),
			detail: `${cleanTitle} → ${audience}`
		});
		return { id, status: "pending_review" };
	}
});

/** Approve and deliver, or reject with a reason. Creators cannot self-approve. */
export const reviewBroadcast = mutation({
	args: { token: v.string(), id: v.id("broadcasts"), decision: v.string(), reason: v.optional(v.string()) },
	handler: async (ctx, { token, id, decision, reason }) => {
		const caller = await authorize(ctx, token, "admin.broadcasts.review");
		if (decision !== "approve" && decision !== "reject") throw new ConvexError("Decision must be approve or reject.");
		const broadcast = await ctx.db.get(id);
		if (!broadcast) throw new ConvexError("That announcement no longer exists.");
		if (broadcast.status !== "pending_review") throw new ConvexError("This announcement has already been reviewed.");
		if (broadcast.createdBy === caller.user._id && !isSuperAdmin(caller.user.email)) {
			throw new ConvexError("A second reviewer must approve an announcement. Ask another administrator to review it.");
		}
		if (decision === "reject") {
			await ctx.db.patch(id, { status: "rejected", reviewedBy: caller.user.email, reviewedAt: Date.now(), reason: reason?.slice(0, 400) });
			await record(ctx, { actorEmail: caller.user.email, actorUserId: caller.user._id, action: "broadcast.rejected", targetType: "broadcast", targetId: String(id), detail: reason?.slice(0, 200) });
			await pushNotification(ctx, { userId: broadcast.createdBy, kind: "product", title: "Announcement rejected", body: reason?.slice(0, 200) ?? "A reviewer rejected your draft.", href: "/admin?tab=broadcasts" });
			return { status: "rejected" };
		}
		const counts = await deliver(ctx, broadcast);
		await ctx.db.patch(id, {
			status: "sent",
			reviewedBy: caller.user.email,
			reviewedAt: Date.now(),
			sentAt: Date.now(),
			recipientCount: counts.total
		});
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "broadcast.sent",
			targetType: "broadcast",
			targetId: String(id),
			detail: `${counts.delivered} delivered, ${counts.suppressed} suppressed by preference`
		});
		return { status: "sent", ...counts };
	}
});

/** Delivery records for one announcement (admin.broadcasts.read). */
export const deliveries = query({
	args: { token: v.string(), broadcastId: v.id("broadcasts") },
	handler: async (ctx, { token, broadcastId }) => {
		await authorize(ctx, token, "admin.broadcasts.read");
		const rows = await ctx.db
			.query("broadcastDeliveries")
			.withIndex("by_broadcast", (q) => q.eq("broadcastId", broadcastId))
			.take(200);
		return {
			delivered: rows.filter((r) => r.status === "delivered").length,
			suppressed: rows.filter((r) => r.status === "suppressed").length,
			rows
		};
	}
});