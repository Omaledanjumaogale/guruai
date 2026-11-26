import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authorize, resolveSession } from "./authz";

/** Append-only audit trail. Writes are internal; reads require admin.audit.read. */
export async function record(
	ctx: any,
	event: {
		actorEmail: string;
		actorUserId?: any;
		action: string;
		targetType: string;
		targetId: string;
		outcome?: string;
		detail?: string;
	}
): Promise<void> {
	await ctx.db.insert("auditEvents", {
		actorEmail: event.actorEmail,
		actorUserId: event.actorUserId,
		action: event.action,
		targetType: event.targetType,
		targetId: event.targetId,
		outcome: event.outcome ?? "success",
		detail: event.detail,
		at: Date.now()
	});
}

export const logInternal = internalMutation({
	args: {
		actorEmail: v.string(),
		action: v.string(),
		targetType: v.string(),
		targetId: v.string(),
		outcome: v.optional(v.string()),
		detail: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		await record(ctx, args);
	}
});

/** Recent administrative events. Limit keeps egress small; the console pages it. */
export const list = query({
	args: { token: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { token, limit }) => {
		const caller = await authorize(ctx, token, "admin.audit.read");
		const rows = await ctx.db.query("auditEvents").withIndex("by_at").order("desc").take(Math.min(limit ?? 60, 200));
		return { rows, actor: caller.user.email };
	}
});

/** The signed-in member sees only their own recent security-relevant events. */
export const mine = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return [];
		return await ctx.db
			.query("auditEvents")
			.withIndex("by_actor", (q) => q.eq("actorEmail", caller.user.email))
			.order("desc")
			.take(20);
	}
});

/** Client-side helper for logging a denied attempt from an action. */
export const deny = mutation({
	args: { token: v.string(), action: v.string(), targetType: v.string(), targetId: v.string() },
	handler: async (ctx, { token, action, targetType, targetId }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return false;
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action,
			targetType,
			targetId,
			outcome: "denied"
		});
		return true;
	}
});