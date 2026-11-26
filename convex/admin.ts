import { v } from "convex/values";
import { query } from "./_generated/server";
import { authorize } from "./authz";

/** Admin-console projections. Each query is bounded and gated by a permission;
 * the console never receives a token-derived secret or a credential field. */

export const overview = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await authorize(ctx, token, "admin.users.read");
		const users = await ctx.db.query("users").order("desc").take(500);
		const pendingRoles = await ctx.db.query("roleAssignments").withIndex("by_status", (q) => q.eq("status", "requested")).order("asc").take(10);
		const pendingBroadcasts = await ctx.db.query("broadcasts").withIndex("by_status", (q) => q.eq("status", "pending_review")).order("asc").take(10);
		const conversations = await ctx.db.query("conversations").order("desc").take(100);
		const auditRows = await ctx.db.query("auditEvents").withIndex("by_at").order("desc").take(8);
		const recentUsers = users.slice(0, 5).map((u) => ({ email: u.email, name: u.name ?? null, role: u.role, provider: u.provider, status: u.status ?? "active", lastLoginAt: u.lastLoginAt }));
		return {
			actor: { email: caller.user.email, roleKeys: caller.roleKeys },
			counts: {
				accounts: users.length,
				active: users.filter((u) => (u.status ?? "active") === "active").length,
				suspended: users.filter((u) => u.status === "suspended").length,
				admins: users.filter((u) => u.role === "admin").length,
				pendingRoles: pendingRoles.length,
				pendingBroadcasts: pendingBroadcasts.length,
				openConversations: conversations.filter((c) => c.status !== "closed").length
			},
			recentUsers,
			audit: auditRows,
			pendingRoles: await Promise.all(
				pendingRoles.map(async (row) => {
					const user = await ctx.db.get(row.userId);
					return { _id: row._id, roleKey: row.roleKey, requestedAt: row.requestedAt, reason: row.reason, email: user?.email ?? "removed", name: user?.name ?? null };
				})
			),
			pendingBroadcasts: pendingBroadcasts.map((b) => ({ _id: b._id, title: b.title, audience: b.audience, createdByEmail: b.createdByEmail, createdAt: b.createdAt }))
		};
	}
});

export const accounts = query({
	args: { token: v.string(), search: v.optional(v.string()) },
	handler: async (ctx, { token, search }) => {
		await authorize(ctx, token, "admin.users.read");
		const term = (search ?? "").trim().toLowerCase();
		const users = term
			? await ctx.db.query("users").withIndex("by_email", (q) => q.gte("email", term)).take(60)
			: await ctx.db.query("users").order("desc").take(60);
		const filtered = users.filter((u) => !term || u.email.toLowerCase().includes(term) || (u.name ?? "").toLowerCase().includes(term));
		return await Promise.all(
			filtered.map(async (u) => {
				const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", u._id)).first();
				const roles = await ctx.db.query("roleAssignments").withIndex("by_user", (q) => q.eq("userId", u._id)).take(6);
				return {
					email: u.email,
					name: u.name ?? profile?.displayName ?? null,
					headline: profile?.headline ?? null,
					role: u.role,
					provider: u.provider,
					status: u.status ?? "active",
					createdAt: u.createdAt,
					lastLoginAt: u.lastLoginAt,
					roles: roles.map((r) => ({ roleKey: r.roleKey, status: r.status }))
				};
			})
		);
	}
});