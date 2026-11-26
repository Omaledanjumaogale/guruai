import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Shared authorisation primitives. Every protected endpoint resolves the caller
 * from the opaque session token — never from a client-supplied user id. */

export async function hashToken(token: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Caller = {
	user: Doc<"users">;
	session: Doc<"sessions">;
	permissions: string[];
	roleKeys: string[];
};

export const ALL_PERMISSIONS = [
	"profile.read.self",
	"profile.update.self",
	"workspace.read",
	"workspace.manage",
	"role.request",
	"role.manage",
	"subscription.read.self",
	"subscription.manage",
	"admin.users.read",
	"admin.users.manage",
	"admin.roles.read",
	"admin.roles.manage",
	"admin.broadcasts.read",
	"admin.broadcasts.create",
	"admin.broadcasts.review",
	"admin.audit.read",
	"messages.create",
	"messages.read.participant",
	"messages.manage",
	"notifications.read.self",
	"notifications.manage_preferences",
	"notifications.broadcast"
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
	"profile.read.self": { label: "Read own profile", description: "View the profile linked to your account" },
	"profile.update.self": { label: "Update own profile", description: "Edit your display name, headline, company and bio" },
	"workspace.read": { label: "Read workspace", description: "Open the AI workspace and its modules" },
	"workspace.manage": { label: "Manage workspace", description: "Change workspace settings, connectors and routing" },
	"role.request": { label: "Request a role", description: "Ask for a self-selectable role" },
	"role.manage": { label: "Manage roles", description: "Approve, reject or revoke role requests" },
	"subscription.read.self": { label: "Read own plan", description: "See your plan and entitlements" },
	"subscription.manage": { label: "Manage subscriptions", description: "Grant, change or cancel a member plan" },
	"admin.users.read": { label: "Read accounts", description: "See the account directory and status" },
	"admin.users.manage": { label: "Manage accounts", description: "Suspend, reactivate or remove accounts" },
	"admin.roles.read": { label: "Read role catalogue", description: "Inspect roles and their permissions" },
	"admin.roles.manage": { label: "Manage role catalogue", description: "Assign privileged roles to accounts" },
	"admin.broadcasts.read": { label: "Read broadcasts", description: "See announcements and delivery status" },
	"admin.broadcasts.create": { label: "Draft broadcasts", description: "Prepare an announcement for review" },
	"admin.broadcasts.review": { label: "Review broadcasts", description: "Approve or reject an announcement before delivery" },
	"admin.audit.read": { label: "Read audit log", description: "Inspect administrative and security events" },
	"messages.create": { label: "Start conversations", description: "Contact the Guru AI team privately" },
	"messages.read.participant": { label: "Read own conversations", description: "Read conversations you participate in" },
	"messages.manage": { label: "Manage conversations", description: "Reply to and close any member conversation" },
	"notifications.read.self": { label: "Read own notifications", description: "See in-app notifications addressed to you" },
	"notifications.manage_preferences": { label: "Notification preferences", description: "Choose which notifications you receive" },
	"notifications.broadcast": { label: "Announcements", description: "Deliver approved announcements to opted-in members" }
};

export function isSuperAdmin(email: string): boolean {
	const configured = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
	return Boolean(configured) && email.trim().toLowerCase() === configured;
}

/** Resolve the caller from a session token. Returns null for expired/unknown tokens. */
export async function resolveSession(ctx: QueryCtx | MutationCtx, token: string): Promise<Caller | null> {
	if (!token) return null;
	const tokenHash = await hashToken(token);
	const session = await ctx.db
		.query("sessions")
		.withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
		.first();
	if (!session || session.expiresAt < Date.now()) return null;
	const user = await ctx.db.get(session.userId);
	if (!user) return null;
	if (user.status === "suspended" || user.status === "deleted") return null;

	const roleKeys = new Set<string>();
	if (user.role) roleKeys.add(user.role);
	const assignments = await ctx.db
		.query("roleAssignments")
		.withIndex("by_user", (q) => q.eq("userId", user._id).eq("status", "active"))
		.collect();
	for (const a of assignments) roleKeys.add(a.roleKey);

	const permissions = new Set<string>();
	if (isSuperAdmin(user.email)) {
		for (const p of ALL_PERMISSIONS) permissions.add(p);
	}
	for (const key of roleKeys) {
		const role = await ctx.db
			.query("roles")
			.withIndex("by_key", (q) => q.eq("key", key))
			.first();
		if (!role || !role.active) continue;
		for (const p of role.permissions) permissions.add(p);
	}
	return { user, session, permissions: [...permissions], roleKeys: [...roleKeys] };
}

export async function authorize(
	ctx: QueryCtx | MutationCtx,
	token: string,
	permission: Permission | Permission[]
): Promise<Caller> {
	const caller = await resolveSession(ctx, token);
	if (!caller) throw new ConvexError("Sign in to continue — your session is missing or has expired.");
	const needed = Array.isArray(permission) ? permission : [permission];
	const missing = needed.filter((p) => !caller.permissions.includes(p));
	if (missing.length) {
		throw new ConvexError(`Your account does not have permission for this action (${missing.join(", ")}).`);
	}
	return caller;
}

/** Fixed-window limiter for abuse-prone mutations (messages, broadcasts, requests). */
export async function rateLimit(
	ctx: MutationCtx,
	key: string,
	limit: number,
	windowMs: number
): Promise<void> {
	const now = Date.now();
	const existing = await ctx.db
		.query("rateLimits")
		.withIndex("by_key", (q) => q.eq("key", key))
		.first();
	if (!existing) {
		await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
		return;
	}
	if (now - existing.windowStart > windowMs) {
		await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
		return;
	}
	if (existing.count >= limit) {
		throw new ConvexError("You are doing that too quickly. Please wait a moment and try again.");
	}
	await ctx.db.patch(existing._id, { count: existing.count + 1 });
}