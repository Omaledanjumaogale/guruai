import { v } from "convex/values";
import { query } from "./_generated/server";
import { authorize } from "./authz";

/** Safe team directory projection for managers and admins. */
export const directory = query({
	args: { token: v.string(), search: v.optional(v.string()) },
	handler: async (ctx, { token, search }) => {
		const caller = await authorize(ctx, token, "admin.users.read");
		const term = (search ?? "").trim().toLowerCase();
		const all = await ctx.db.query("users").order("desc").take(200);
		const plans = await ctx.db.query("plans").take(20);
		const planName = new Map(plans.map((plan) => [plan.key, plan.name]));
		const rows = term
			? all.filter((u) => u.email.toLowerCase().includes(term) || (u.name ?? "").toLowerCase().includes(term))
			: all;

		const members = await Promise.all(
			rows.map(async (u) => {
				const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", u._id)).first();
				const assignments = await ctx.db
					.query("roleAssignments")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.take(8);
				const subscriptions = await ctx.db
					.query("subscriptions")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.take(4);
				const subscription = subscriptions.find((s) => s.status === "active") ?? subscriptions[0];
				return {
					email: u.email,
					name: u.name ?? profile?.displayName ?? u.email,
					headline: profile?.headline ?? null,
					baseRole: u.role,
					roles: assignments.filter((r) => r.status === "active").map((r) => r.roleKey),
					pendingRoles: assignments.filter((r) => r.status === "requested").map((r) => r.roleKey),
					plan: u.role === "admin" ? "Enterprise" : subscription ? (planName.get(subscription.planKey) ?? subscription.planKey) : "Starter",
					planStatus: subscription?.status ?? "none",
					provider: u.provider,
					status: u.status ?? "active",
					hubLinked: Boolean(u.hubId),
					hubEmail: u.hubEmail ?? null,
					createdAt: u.createdAt,
					lastLoginAt: u.lastLoginAt
				};
			})
		);

		return {
			caller: { email: caller.user.email, roleKeys: caller.roleKeys },
			members,
			counts: {
				total: all.length,
				active: all.filter((u) => (u.status ?? "active") === "active").length,
				suspended: all.filter((u) => u.status === "suspended").length,
				hubLinked: all.filter((u) => Boolean(u.hubId)).length,
				admins: all.filter((u) => u.role === "admin").length,
				visible: members.length
			}
		};
	}
});
