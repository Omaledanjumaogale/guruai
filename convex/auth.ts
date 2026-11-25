import { v, ConvexError } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
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

type LoginResult = { token: string; account: { email: string; name: string; role: string; provider: string } };

async function loginCore(ctx: any, rawEmail: string, password: string): Promise<LoginResult> {
	const email = normaliseEmail(rawEmail);
	if (!isEmail(email)) throw new ConvexError("Enter a valid email address.");
	const adminEmail = superAdminEmail();
	const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "";
	const envAdmin = Boolean(adminEmail) && email === adminEmail && Boolean(adminPassword) && password === adminPassword;

	let user = await ctx.runQuery(internal.authInternal.lookupByEmail, { email });

	if (!user) {
		// Bootstrap the configured super-admin on first password sign-in.
		if (envAdmin) {
			const userId = await ctx.runMutation(internal.authInternal.ensurePasswordUser, {
				email,
				name: "Super Admin",
				role: "admin",
				passwordHash: await hashPassword(password)
			});
			const token = await createSession(ctx, userId, "admin");
			return { token, account: { email, name: "Super Admin", role: "admin", provider: "password" } };
		}
		throw new ConvexError("No account found for this email. Create one first.");
	}

	let ok = false;
	if (user.passwordHash) ok = await checkPassword(password, user.passwordHash);
	else if (envAdmin) ok = true;
	if (!ok) throw new ConvexError("That email and password do not match.");

	let role = user.role;
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
	return { token, account: { email, name, role, provider: user.provider } };
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
		return { email: user.email, name: user.name ?? user.email, role: user.role, provider: user.provider, avatarUrl: user.avatarUrl };
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