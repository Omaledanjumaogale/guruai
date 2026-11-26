import { v, ConvexError } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { hubConfigured, hubSignIn, HubError, type HubIdentity } from "./hubClient";
import { resolveSession } from "./authz";
/** SHA-256 via WebCrypto (available in the Convex V8 runtime). */
export function randomToken(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return `gst_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function sha256(s: string): Promise<string> {
	const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}


/**
 * Guru AI identity — Google & GitHub OAuth (via HTTP actions in http.ts) plus
 * the super-admin password login. Browsers hold only an opaque session token.
 */

const SESSION_DAYS = 14;

async function createSession(ctx: any, userId: string, role: string): Promise<string> {
	const token = randomToken();
	await ctx.runMutation(internal.authInternal.insertSession, {
		tokenHash: await sha256(token),
		userId,
		role,
		expiresAt: Date.now() + SESSION_DAYS * 24 * 3600 * 1000
	});
	return token;
}

// ------------------------------------------------------------ passwords ----
const normaliseEmail = (email: string) => email.trim().toLowerCase();
const superAdminEmail = () => (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

async function hashPassword(password: string): Promise<string> {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	const salt = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
	return `${salt}$${await sha256(`${salt}:${password}`)}`;
}

async function checkPassword(password: string, stored: string): Promise<boolean> {
	const [salt, hash] = stored.split("$");
	if (!salt || !hash) return false;
	return (await sha256(`${salt}:${password}`)) === hash;
}

type LoginResult = {
	token: string;
	account: { email: string; name: string; role: string; provider: string; hubLinked?: boolean; hubEmail?: string };
};

/** Provision or synchronise a local account after the hub has verified the identity. */
async function finishHubLogin(ctx: any, hub: HubIdentity, password: string): Promise<LoginResult> {
	const email = normaliseEmail(hub.email);
	const existing = await ctx.runQuery(internal.authInternal.lookupByEmail, { email });
	if (existing?.status === "suspended" || existing?.status === "deleted") {
		throw new ConvexError("This account is suspended. Contact the workspace owner.");
	}
	if (existing?.hubId && existing.hubId !== hub.id) {
		throw new ConvexError("This email is linked to a different E-WIN identity. Contact the workspace owner.");
	}
	const role = existing?.role === "admin" || email === superAdminEmail() ? "admin" : "member";
	const passwordHash = await hashPassword(password);
	const userId = await ctx.runMutation(internal.authInternal.syncHubUser, {
		email,
		name: hub.name,
		role,
		passwordHash,
		hubId: hub.id,
		hubEmail: hub.email
	});
	const token = await createSession(ctx, userId, role);
	await ctx.runMutation(internal.audit.logInternal, {
		actorEmail: email,
		action: existing ? "auth.hub_synced" : "auth.hub_provisioned",
		targetType: "user",
		targetId: email,
		outcome: "success",
		detail: existing
			? "Signed in through the E-WIN central hub; local password and identity synchronised."
			: "Provisioned from the E-WIN central hub on first sign-in."
	});
	return {
		token,
		account: {
			email,
			name: existing?.name ?? hub.name ?? email.split("@")[0],
			role,
			provider: existing?.provider ?? "ewin",
			hubLinked: true,
			hubEmail: hub.email
		}
	};
}

async function completeLocalLogin(
	ctx: any,
	user: any,
	email: string,
	password: string,
	envAdmin: boolean
): Promise<LoginResult> {
	let role = user.role;
	const adminEmail = superAdminEmail();
	if (role !== "admin" && email === adminEmail) {
		await ctx.runMutation(internal.authInternal.promoteAdmin, { userId: user._id });
		role = "admin";
	}
	if (envAdmin && !user.passwordHash) {
		await ctx.runMutation(internal.authInternal.setPasswordHash, { userId: user._id, passwordHash: await hashPassword(password) });
	} else {
		await ctx.runMutation(internal.authInternal.touchLogin, { userId: user._id });
	}
	const name = user.name ?? email.split("@")[0];
	const token = await createSession(ctx, user._id, role);
	return { token, account: { email, name, role, provider: user.provider, hubLinked: Boolean(user.hubId), hubEmail: user.hubEmail } };
}

async function loginCore(ctx: any, rawEmail: string, password: string): Promise<LoginResult> {
	const email = normaliseEmail(rawEmail);
	if (!isEmail(email)) throw new ConvexError("Enter a valid email address.");
	const adminEmail = superAdminEmail();
	const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "";
	const envAdmin = Boolean(adminEmail) && email === adminEmail && Boolean(adminPassword) && password === adminPassword;

	let user = await ctx.runQuery(internal.authInternal.lookupByEmail, { email });

	// Bootstrap the configured super-admin on first password sign-in. Other
	// unknown emails fall through to the E-WIN Hub check below.
	if (!user && envAdmin) {
		const userId = await ctx.runMutation(internal.authInternal.ensurePasswordUser, {
			email,
			name: "Super Admin",
			role: "admin",
			passwordHash: await hashPassword(password)
		});
		const token = await createSession(ctx, userId, "admin");
		return { token, account: { email, name: "Super Admin", role: "admin", provider: "password" } };
	}

	if (user?.status === "suspended" || user?.status === "deleted") {
		throw new ConvexError("This account is suspended. Contact the workspace owner.");
	}

	let ok = false;
	if (user?.passwordHash) ok = await checkPassword(password, user.passwordHash);
	else if (user && envAdmin) ok = true;

	// Hub-linked accounts are authoritative at the hub. Local hashes are only a
	// convenience copy; the configured super admin keeps a break-glass password.
	if (ok && user && (!user.hubId || envAdmin)) {
		return await completeLocalLogin(ctx, user, email, password, envAdmin);
	}

	// Verify against the central hub, then provision/synchronise the local account.
	let hubFailure: unknown = null;
	let hubIdentity: HubIdentity | null = null;
	if (hubConfigured()) {
		try {
			hubIdentity = await hubSignIn(email, password);
		} catch (error) {
			hubFailure = error;
		}
	}
	if (hubIdentity) return await finishHubLogin(ctx, hubIdentity, password);

	if (hubFailure instanceof HubError && hubFailure.kind === "unverified") {
		throw new ConvexError(hubFailure.message);
	}
	if (ok && user) {
		if (hubFailure instanceof HubError && hubFailure.kind === "credentials" && user.hubId) {
			throw new ConvexError("E-WIN Hub rejected this password. Use your current hub password or reset it at ewinproject.org.");
		}
		// Hub unavailable: honour the last locally verified hash rather than
		// locking every member out during an outage.
		return await completeLocalLogin(ctx, user, email, password, envAdmin);
	}
	if (!user) {
		if (hubFailure instanceof HubError && hubFailure.kind === "credentials") {
			throw new ConvexError("That email and password do not match your E-WIN Hub or Guru AI account.");
		}
		if (hubFailure instanceof HubError && hubFailure.kind === "unreachable") {
			throw new ConvexError("No local account was found and E-WIN Hub is unreachable. Try again in a moment.");
		}
		throw new ConvexError("No account found for this email. Create one first.");
	}
	throw new ConvexError("That email and password do not match. Use your E-WIN Hub password or reconnect on the Hub page.");
}

/** Create an email + password account. The super-admin email is promoted to admin. */
export const register = action({
	args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
	handler: async (ctx, { email, password, name }) => {
		const mail = normaliseEmail(email);
		if (!isEmail(mail)) throw new ConvexError("Enter a valid email address.");
		if (password.length < 8) throw new ConvexError("Choose a password with at least 8 characters.");

		const existing = await ctx.runQuery(internal.authInternal.lookupByEmail, { email: mail });
		if (existing?.passwordHash) throw new ConvexError("An account already exists for this email. Sign in instead.");

		// If this identity already lives in the E-WIN hub, adopt it instead of
		// creating a second, disconnected password account.
		if (hubConfigured()) {
			let hub: HubIdentity | null = null;
			try {
				hub = await hubSignIn(mail, password);
			} catch (error) {
				if (error instanceof HubError && error.kind === "unverified") throw new ConvexError(error.message);
				// No hub identity for this email: continue with a local account.
			}
			if (hub) return await finishHubLogin(ctx, hub, password);
		}

		const role = mail === superAdminEmail() ? "admin" : "member";
		const displayName = name?.trim() || existing?.name || mail.split("@")[0];
		const userId = await ctx.runMutation(internal.authInternal.ensurePasswordUser, {
			email: mail,
			name: displayName,
			role,
			passwordHash: await hashPassword(password)
		});
		const token = await createSession(ctx, userId, role);
		return { token, account: { email: mail, name: displayName, role, provider: "password" } };
	}
});

/** Email + password sign-in for members and the super admin. */
export const passwordLogin = action({
	args: { email: v.string(), password: v.string() },
	handler: async (ctx, { email, password }) => loginCore(ctx, email, password)
});

/** Explicit E-WIN Hub sign-in. Unlike passwordLogin, local credentials are not tried. */
export const hubLogin = action({
	args: { email: v.string(), password: v.string() },
	handler: async (ctx, { email, password }) => {
		const mail = normaliseEmail(email);
		if (!isEmail(mail)) throw new ConvexError("Enter a valid email address.");
		if (!hubConfigured()) throw new ConvexError("E-WIN Hub is not configured on this deployment.");
		try {
			const hub = await hubSignIn(mail, password);
			return await finishHubLogin(ctx, hub, password);
		} catch (error) {
			if (error instanceof HubError) throw new ConvexError(error.message);
			throw error;
		}
	}
});

/** Super-admin password login (kept for backwards compatibility). */
export const adminLogin = action({
	args: { email: v.string(), password: v.string() },
	handler: async (ctx, { email, password }) => {
		const adminEmail = superAdminEmail();
		const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "";
		if (!adminEmail || !adminPassword) throw new ConvexError("Admin credentials are not configured on this deployment.");
		const res = await loginCore(ctx, email, password);
		if (res.account.role !== "admin" || normaliseEmail(email) !== adminEmail) {
			throw new ConvexError("These credentials are not the super-admin account.");
		}
		return { token: res.token, role: res.account.role, email: res.account.email };
	}
});

/** Verify a browser session token; returns the account or null. */
export const verify = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const tokenHash = await sha256(token);
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
			.first();
		if (!session || session.expiresAt < Date.now()) return null;
		const user = await ctx.db.get(session.userId);
		if (!user) return null;
		return {
			email: user.email,
			name: user.name ?? user.email,
			role: user.role,
			provider: user.provider,
			avatarUrl: user.avatarUrl,
			hubLinked: Boolean(user.hubId),
			hubEmail: user.hubEmail ?? null
		};
	}
});

export const logout = mutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const tokenHash = await sha256(token);
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
			.first();
		if (session) await ctx.db.delete(session._id);
	}
});

/** Admin console data: accounts + engine summary. */
export const adminOverview = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const tokenHash = await sha256(token);
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
			.first();
		if (!session || session.role !== "admin" || session.expiresAt < Date.now()) return null;
		const users = await ctx.db.query("users").order("desc").take(50);
		const connectors = await ctx.db.query("connectors").collect();
		const workspaces = await ctx.db.query("workspaces").collect();
		const events = await ctx.db.query("usageEvents").order("desc").take(20);
		return {
			users: users.map((u) => ({ email: u.email, name: u.name, role: u.role, provider: u.provider, lastLoginAt: u.lastLoginAt })),
			connectors: connectors.map((c) => ({ provider: c.provider, status: c.status, origin: c.origin })),
			workspaceCount: workspaces.length,
			recentEvents: events.map((e) => ({ module: e.module, action: e.action, ok: e.ok, createdAt: e.createdAt }))
		};
	}
});

/** Remove an account and its sessions. Super-admin sessions only. */
export const removeUser = action({
	args: { token: v.string(), email: v.string() },
	handler: async (ctx, { token, email }) => {
		const me = await ctx.runQuery(api.auth.verify, { token });
		if (!me || me.role !== "admin") throw new ConvexError("A super-admin session is required.");
		const target = normaliseEmail(email);
		if (target === superAdminEmail()) throw new ConvexError("The configured super-admin account cannot be removed.");
		const removed = await ctx.runMutation(internal.authInternal.deleteUserByEmail, { email: target });
		if (!removed) throw new ConvexError("No account with that email address.");
		await ctx.runMutation(internal.audit.logInternal, {
			actorEmail: me.email,
			action: "account.removed",
			targetType: "user",
			targetId: target,
			outcome: "success",
			detail: "Removed from the Super Admin Console; sessions revoked."
		});
		return { removed: target };
	}
});

export const listUsers = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const tokenHash = await sha256(token);
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
			.first();
		if (!session || session.role !== "admin") return null;
		return await ctx.db.query("users").order("desc").take(100);
	}
});

/** Session inventory for the signed-in account. */
export const sessions = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) return null;
		const rows = await ctx.db
			.query("sessions")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.order("desc")
			.take(40);
		return rows.map((row) => ({
			id: row._id,
			createdAt: row.createdAt,
			expiresAt: row.expiresAt,
			role: row.role,
			current: row._id === caller.session._id
		}));
	}
});

/** End every session except the one making the request. */
export const revokeOtherSessions = mutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) throw new ConvexError("Sign in to manage sessions.");
		const rows = await ctx.db
			.query("sessions")
			.withIndex("by_user", (q) => q.eq("userId", caller.user._id))
			.take(100);
		let removed = 0;
		for (const row of rows) {
			if (row._id === caller.session._id) continue;
			await ctx.db.delete(row._id);
			removed++;
		}
		await ctx.runMutation(internal.audit.logInternal, {
			actorEmail: caller.user.email,
			action: "security.sessions_revoked",
			targetType: "user",
			targetId: caller.user.email,
			outcome: "success",
			detail: removed + " other session(s) ended by the account owner."
		});
		return { removed };
	}
});

/** End one other session owned by the signed-in account. */
export const revokeSession = mutation({
	args: { token: v.string(), sessionId: v.id("sessions") },
	handler: async (ctx, { token, sessionId }) => {
		const caller = await resolveSession(ctx, token);
		if (!caller) throw new ConvexError("Sign in to manage sessions.");
		if (sessionId === caller.session._id) throw new ConvexError("Use Sign out to end the current session.");
		const row = await ctx.db.get(sessionId);
		if (!row || row.userId !== caller.user._id) throw new ConvexError("That session does not belong to your account.");
		await ctx.db.delete(sessionId);
		await ctx.runMutation(internal.audit.logInternal, {
			actorEmail: caller.user.email,
			action: "security.session_revoked",
			targetType: "session",
			targetId: sessionId,
			outcome: "success",
			detail: "A session was ended by the account owner."
		});
		return { removed: true };
	}
});
