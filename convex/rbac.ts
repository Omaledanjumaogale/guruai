import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authorize, isSuperAdmin, PERMISSION_LABELS, rateLimit, resolveSession } from "./authz";
import { ROLE_DEFS, PLAN_DEFS, effectivePlan } from "./entitlements";
import { record } from "./audit";
import { notifyAdmins, pushNotification } from "./notify";

const ROLES = ["requested", "active", "rejected", "suspended"] as const;

async function seed(ctx: any) {
	let roles = 0;
	let plans = 0;
	for (const def of ROLE_DEFS) {
		const existing = await ctx.db.query("roles").withIndex("by_key", (q: any) => q.eq("key", def.key)).first();
		if (!existing) {
			await ctx.db.insert("roles", def);
			roles++;
		}
	}
	for (const def of PLAN_DEFS) {
		const existing = await ctx.db.query("plans").withIndex("by_key", (q: any) => q.eq("key", def.key)).first();
		if (!existing) {
			await ctx.db.insert("plans", def);
			plans++;
		}
	}
	return { roles, plans };
}

/** Idempotent catalogue seed, run by the deployment or from the console. */
export const seedDefaults = internalMutation({
	args: {},
	handler: async (ctx) => seed(ctx)
});

/** Public bootstrap: only fills an empty catalogue, never edits existing policy. */
export const bootstrap = mutation({
	args: {},
	handler: async (ctx) => seed(ctx)
});

/** Role catalogue + permission metadata. Static policy, safe to read publicly. */
export const catalogue = query({
	args: {},
	handler: async (ctx) => {
		const roles = await ctx.db.query("roles").collect();
		const plans = await ctx.db.query("plans").collect();
		return {
			roles: roles.sort((a, b) => b.rank - a.rank),
			plans,
			permissions: Object.entries(PERMISSION_LABELS).map(([key, meta]) => ({ key, ...meta }))
		};
	}
});

/** Everything the signed-in shell needs, in one live query (keeps egress small). */
export const me = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		const { user } = caller;
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.first();
		const assignments = await ctx.db
			.query("roleAssignments")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const plan = await effectivePlan(ctx, user._id);
		const recentNotifications = await ctx.db
			.query("notifications")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.take(100);
		const myConversations = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		return {
			account: {
				email: user.email,
				name: user.name ?? user.email,
				avatarUrl: user.avatarUrl,
				provider: user.provider,
				role: user.role,
				status: user.status ?? "active",
				createdAt: user.createdAt,
				lastLoginAt: user.lastLoginAt
			},
			profile: profile ?? null,
			roles: assignments.map((a) => ({ _id: a._id, roleKey: a.roleKey, status: a.status, requestedAt: a.requestedAt, decidedAt: a.decidedAt, reason: a.reason })),
			roleKeys: caller.roleKeys,
			permissions: caller.permissions,
			plan,
			unreadNotifications: recentNotifications.filter((n) => !n.readAt).length,
			conversationCount: myConversations.length
		};
	}
});

/** Ask for a self-selectable role. Privileged roles go through review. */
export const requestRole = mutation({
	args: { token: v.string(), roleKey: v.string(), note: v.optional(v.string()) },
	handler: async (ctx, { token, roleKey, note }) => {
		const caller = await authorize(ctx, token, "role.request");
		await rateLimit(ctx, `role:${caller.user._id}`, 5, 60 * 60 * 1000);
		const role = await ctx.db.query("roles").withIndex("by_key", (q) => q.eq("key", roleKey)).first();
		if (!role || !role.active || !role.selfSelectable) {
			throw new ConvexError("That role is not available for self-selection. Ask an administrator to assign it.");
		}
		const existing = await ctx.db
			.query("roleAssignments")
			.withIndex("by_user_role", (q) => q.eq("userId", caller.user._id).eq("roleKey", roleKey))
			.collect();
		if (existing.some((a) => a.status === "active")) throw new ConvexError(`You already hold the ${role.name} role.`);
		if (existing.some((a) => a.status === "requested")) throw new ConvexError("Your request is already waiting for review.");
		const now = Date.now();
		const status = role.requiresApproval ? "requested" : "active";
		const id = await ctx.db.insert("roleAssignments", {
			userId: caller.user._id,
			roleKey,
			status,
			requestedAt: now,
			decidedAt: role.requiresApproval ? undefined : now,
			reason: note?.slice(0, 400)
		});
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: role.requiresApproval ? "role.requested" : "role.activated",
			targetType: "roleAssignment",
			targetId: String(id),
			detail: roleKey
		});
		if (role.requiresApproval) {
			await notifyAdmins(ctx, {
				kind: "role",
				title: `${role.name} access requested`,
				body: `${caller.user.name ?? caller.user.email} asked for the ${role.name} role. ${note ? `Note: ${note.slice(0, 180)}` : ""}`.trim(),
				href: "/admin?tab=roles"
			});
		} else {
			await pushNotification(ctx, {
				userId: caller.user._id,
				kind: "role",
				title: `${role.name} role active`,
				body: "Your role is now active on this account.",
				href: "/roles"
			});
		}
		return { status, roleKey };
	}
});

/** Approve, reject, suspend or reinstate a role assignment. */
export const decideRole = mutation({
	args: { token: v.string(), assignmentId: v.id("roleAssignments"), decision: v.string(), reason: v.optional(v.string()) },
	handler: async (ctx, { token, assignmentId, decision, reason }) => {
		const caller = await authorize(ctx, token, "role.manage");
		if (!ROLES.includes(decision as (typeof ROLES)[number])) throw new ConvexError("Unknown decision.");
		const assignment = await ctx.db.get(assignmentId);
		if (!assignment) throw new ConvexError("That role request no longer exists.");
		const role = await ctx.db.query("roles").withIndex("by_key", (q) => q.eq("key", assignment.roleKey)).first();
		if (!role) throw new ConvexError("The role definition is missing.");
		if (role.key === "admin" && !caller.permissions.includes("admin.roles.manage")) {
			throw new ConvexError("Only a role administrator can grant the Super Admin role.");
		}
		const target = await ctx.db.get(assignment.userId);
		if (!target) throw new ConvexError("The account no longer exists.");
		if (isSuperAdmin(target.email) && decision !== "active") {
			throw new ConvexError("The configured super-admin role cannot be revoked here.");
		}
		await ctx.db.patch(assignmentId, { status: decision, decidedAt: Date.now(), decidedBy: caller.user.email, reason: reason?.slice(0, 400) });
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: `role.${decision}`,
			targetType: "roleAssignment",
			targetId: String(assignmentId),
			detail: `${assignment.roleKey} → ${target.email}${reason ? ` (${reason.slice(0, 160)})` : ""}`
		});
		await pushNotification(ctx, {
			userId: target._id,
			kind: "role",
			title: `Role update: ${role.name}`,
			body: decision === "active" ? "Your role is now active." : `Your role is now ${decision}.${reason ? ` Reason: ${reason.slice(0, 180)}` : ""}`,
			href: "/roles"
		});
		return { status: decision };
	}
});

/** Directly assign a role (least privilege: admin.roles.manage). */
export const assignRole = mutation({
	args: { token: v.string(), email: v.string(), roleKey: v.string(), reason: v.optional(v.string()) },
	handler: async (ctx, { token, email, roleKey, reason }) => {
		const caller = await authorize(ctx, token, "admin.roles.manage");
		const target = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).first();
		if (!target) throw new ConvexError("No account with that email address.");
		const role = await ctx.db.query("roles").withIndex("by_key", (q) => q.eq("key", roleKey)).first();
		if (!role) throw new ConvexError("Unknown role.");
		if (role.rank >= 100 && !isSuperAdmin(caller.user.email)) throw new ConvexError("Only the configured super admin can grant that role.");
		const existing = await ctx.db
			.query("roleAssignments")
			.withIndex("by_user_role", (q) => q.eq("userId", target._id).eq("roleKey", roleKey))
			.collect();
		const active = existing.find((a) => a.status === "active");
		const now = Date.now();
		if (active) {
			await ctx.db.patch(active._id, { decidedAt: now, decidedBy: caller.user.email, reason: reason?.slice(0, 400) });
		} else {
			await ctx.db.insert("roleAssignments", {
				userId: target._id,
				roleKey,
				status: "active",
				requestedAt: now,
				decidedAt: now,
				decidedBy: caller.user.email,
				reason: reason?.slice(0, 400)
			});
		}
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: "role.assigned",
			targetType: "user",
			targetId: String(target._id),
			detail: `${roleKey} → ${target.email}`
		});
		await pushNotification(ctx, { userId: target._id, kind: "role", title: `${role.name} role assigned`, body: "An administrator assigned you a new role.", href: "/roles" });
		return { roleKey, email: target.email };
	}
});

/** Approvals queue (role.manage) with requester details. */
export const assignments = query({
	args: { token: v.string(), status: v.optional(v.string()) },
	handler: async (ctx, { token, status }) => {
		const caller = await authorize(ctx, token, "role.manage");
		const list =
			status === "all" || !status
				? await ctx.db.query("roleAssignments").order("desc").take(150)
				: await ctx.db
						.query("roleAssignments")
						.withIndex("by_status", (q) => q.eq("status", status).gte("requestedAt", 0))
						.order("desc")
						.take(100);
		const out = await Promise.all(
			list.map(async (a) => {
				const user = await ctx.db.get(a.userId);
				const role = await ctx.db.query("roles").withIndex("by_key", (q) => q.eq("key", a.roleKey)).first();
				return { ...a, email: user?.email ?? "removed", name: user?.name ?? null, roleName: role?.name ?? a.roleKey };
			})
		);
		return { rows: out, actor: caller.user.email };
	}
});

/** Suspend or reactivate an account; suspending ends its sessions immediately. */
export const setUserStatus = mutation({
	args: { token: v.string(), email: v.string(), status: v.string(), reason: v.optional(v.string()) },
	handler: async (ctx, { token, email, status, reason }) => {
		const caller = await authorize(ctx, token, "admin.users.manage");
		if (status !== "active" && status !== "suspended") throw new ConvexError("Status must be active or suspended.");
		const target = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).first();
		if (!target) throw new ConvexError("No account with that email address.");
		if (target._id === caller.user._id) throw new ConvexError("You cannot change the status of your own account.");
		if (isSuperAdmin(target.email)) throw new ConvexError("The configured super-admin account cannot be suspended.");
		await ctx.db.patch(target._id, { status });
		if (status === "suspended") {
			const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", target._id)).collect();
			for (const s of sessions) await ctx.db.delete(s._id);
		}
		await record(ctx, {
			actorEmail: caller.user.email,
			actorUserId: caller.user._id,
			action: `user.${status}`,
			targetType: "user",
			targetId: String(target._id),
			detail: reason?.slice(0, 300)
		});
		await pushNotification(ctx, { userId: target._id, kind: "security", title: `Account ${status}`, body: reason?.slice(0, 200) ?? `Your account is now ${status}.`, href: "/settings" });
		return { email: target.email, status };
	}
});