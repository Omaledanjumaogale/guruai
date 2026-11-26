import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authorize, isSuperAdmin, resolveSession } from "./authz";
import { effectivePlan } from "./entitlements";
import { record } from "./audit";
import { pushNotification } from "./notify";

/** Plan catalogue with the entitlements each plan unlocks. */
export const plans = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("plans").collect();
		return rows.filter((p) => p.active).sort((a, b) => b.entitlements.length - a.entitlements.length);
	}
});

/** The signed-in member's effective plan plus change history. */
export const me = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		const plan = await effectivePlan(ctx, caller.user._id);
		const history = await ctx.db
			.query("subscriptions")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id).gte("status", ""))
			.collect();
		return {
			plan,
			history: history.sort((a, b) => b.startedAt - a.startedAt).slice(0, 10)
		};
	}
});

/** Grant or change a member plan (subscription.manage). Previous plan is closed. */
export const grant = mutation({
	args: { token: v.string(), email: v.string(), planKey: v.string(), renewsAt: v.optional(v.number()), note: v.optional(v.string()) },
	handler: async (ctx, { token, email, planKey, renewsAt, note }) => {
		const caller = await authorize(ctx, token, "subscription.manage");
		const target = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).first();
		if (!target) throw new ConvexError("No account with that email address.");
		const plan = await ctx.db.query("plans").withIndex("by_key", (q) => q.eq("key", planKey)).first();
		if (!plan || !plan.active) throw new ConvexError("Unknown plan.");
		if (planKey === "enterprise" && !isSuperAdmin(caller.user.email)) {
			throw new ConvexError("Only the configured super admin can grant the Enterprise plan.");
		}
		const now = Date.now();
		const active = await ctx.db
			.query("subscriptions")
			.withIndex("by_user", (q) => q.eq("userId", target._id).eq("status", "active"))
			.collect();
		for (const row of active) await ctx.db.patch(row._id, { status: "cancelled" });
		await ctx.db.insert("subscriptions", {
			userId: target._id,
			planKey,
			status: "active",
			startedAt: now,
			renewsAt,
			grantedBy: caller.user.email,
			note: note?.slice(0, 400)
		});
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "subscription.granted",
			targetType: "user",
			targetId: String(target._id),
			detail: `${planKey} → ${target.email}${note ? ` (${note.slice(0, 160)})` : ""}`
		});
		await pushNotification(ctx, {
			userId: target._id,
			kind: "subscription",
			title: `Plan updated: ${plan.name}`,
			body: `Your workspace plan is now ${plan.name}. ${plan.description}`,
			href: "/subscription"
		});
		return { planKey, email: target.email };
	}
});

/** Cancel the active plan; the account falls back to Starter. */
export const cancel = mutation({
	args: { token: v.string(), email: v.string(), note: v.optional(v.string()) },
	handler: async (ctx, { token, email, note }) => {
		const caller = await authorize(ctx, token, "subscription.manage");
		const target = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).first();
		if (!target) throw new ConvexError("No account with that email address.");
		const active = await ctx.db
			.query("subscriptions")
			.withIndex("by_user", (q) => q.eq("userId", target._id).eq("status", "active"))
			.collect();
		for (const row of active) await ctx.db.patch(row._id, { status: "cancelled" });
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "subscription.cancelled",
			targetType: "user",
			targetId: String(target._id),
			detail: note?.slice(0, 300)
		});
		await pushNotification(ctx, { userId: target._id, kind: "subscription", title: "Plan cancelled", body: "Your account is back on the Starter plan.", href: "/subscription" });
		return { cancelled: active.length };
	}
});

/** Plan distribution for the console (admin.users.read). */
export const overview = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		await authorize(ctx, token, "admin.users.read");
		const active = await ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "active")).take(200);
		const plans = await ctx.db.query("plans").collect();
		const counts: Record<string, number> = {};
		for (const p of plans) counts[p.key] = 0;
		for (const row of active) counts[row.planKey] = (counts[row.planKey] ?? 0) + 1;
		return { activeCount: active.length, counts, plans: plans.map((p) => ({ key: p.key, name: p.name, priceLabel: p.priceLabel })) };
	}
});