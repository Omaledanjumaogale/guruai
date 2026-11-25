import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const insertSession = internalMutation({
	args: { tokenHash: v.string(), userId: v.id("users"), role: v.string(), expiresAt: v.number() },
	handler: async (ctx, args) => {
		return ctx.db.insert("sessions", { ...args, createdAt: Date.now() });
	}
});

export const lookupByEmail = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		return await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
	}
});

export const setPasswordHash = internalMutation({
	args: { userId: v.id("users"), passwordHash: v.string() },
	handler: async (ctx, { userId, passwordHash }) => {
		await ctx.db.patch(userId, { passwordHash, lastLoginAt: Date.now() });
	}
});

export const ensurePasswordUser = internalMutation({
	args: { email: v.string(), name: v.optional(v.string()), role: v.string(), passwordHash: v.string() },
	handler: async (ctx, { email, name, role, passwordHash }) => {
		const now = Date.now();
		const existing = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
		if (existing) {
			await ctx.db.patch(existing._id, {
				provider: existing.provider === "google" || existing.provider === "github" ? existing.provider : "password",
				name: name ?? existing.name,
				// Never demote an admin; promote when the configured super-admin email signs up.
				role: existing.role === "admin" ? "admin" : role,
				passwordHash,
				lastLoginAt: now
			});
			return existing._id;
		}
		return await ctx.db.insert("users", {
			provider: "password",
			email,
			name,
			role,
			passwordHash,
			createdAt: now,
			lastLoginAt: now
		});
	}
});

export const promoteAdmin = internalMutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		await ctx.db.patch(userId, { role: "admin", lastLoginAt: Date.now() });
	}
});

export const touchLogin = internalMutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		await ctx.db.patch(userId, { lastLoginAt: Date.now() });
	}
});

export const deleteUserByEmail = internalMutation({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
		if (!user) return false;
		const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
		for (const s of sessions) await ctx.db.delete(s._id);
		await ctx.db.delete(user._id);
		return true;
	}
});

export const upsertUser = internalMutation({
	args: {
		provider: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		role: v.string(),
		externalId: v.optional(v.string()),
		avatarUrl: v.optional(v.string())
	},
	handler: async (ctx, { provider, email, name, role, externalId, avatarUrl }) => {
		const now = Date.now();
		if (externalId) {
			const existing = await ctx.db
				.query("users")
				.withIndex("by_external", (q) => q.eq("provider", provider).eq("externalId", externalId))
				.first();
			if (existing) {
				await ctx.db.patch(existing._id, { name, avatarUrl, lastLoginAt: now });
				return existing._id;
			}
		}
		const byEmail = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
		if (byEmail) {
			await ctx.db.patch(byEmail._id, { provider, externalId, name, avatarUrl, lastLoginAt: now, role: byEmail.role === "admin" ? "admin" : role });
			return byEmail._id;
		}
		return ctx.db.insert("users", { provider, email, name, role, externalId, avatarUrl, createdAt: now, lastLoginAt: now });
	}
});