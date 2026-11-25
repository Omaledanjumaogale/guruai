import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const SECRET_PREFIX = "gk_";

/** Store a connector. The token never leaves the server after this call. */
export const add = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		provider: v.string(),
		label: v.string(),
		baseUrl: v.optional(v.string()),
		token: v.string(),
		origin: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const masked = args.token.length > 8 ? `${args.token.slice(0, 3)}…${args.token.slice(-4)}` : "••••";
		return ctx.db.insert("connectors", {
			workspaceId: args.workspaceId,
			provider: args.provider,
			label: args.label,
			baseUrl: args.baseUrl,
			token: args.token,
			masked,
			status: "untested",
			origin: args.origin ?? "manual",
			createdAt: now,
			updatedAt: now
		});
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) =>
		await ctx.db
			.query("connectors")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.collect()
});

export const remove = mutation({
	args: { id: v.id("connectors") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	}
});

export const setStatus = mutation({
	args: { id: v.id("connectors"), status: v.string(), lastError: v.optional(v.string()) },
	handler: async (ctx, { id, status, lastError }) => {
		await ctx.db.patch(id, { status, lastError, lastCheckedAt: Date.now(), updatedAt: Date.now() });
	}
});

export const update = mutation({
	args: {
		id: v.id("connectors"),
		label: v.optional(v.string()),
		baseUrl: v.optional(v.string()),
		token: v.optional(v.string())
	},
	handler: async (ctx, { id, label, baseUrl, token }) => {
		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		if (label !== undefined) patch.label = label;
		if (baseUrl !== undefined) patch.baseUrl = baseUrl;
		if (token !== undefined) {
			patch.token = token;
			patch.masked = token.length > 8 ? `${token.slice(0, 3)}…${token.slice(-4)}` : "••••";
			patch.status = "untested";
		}
		await ctx.db.patch(id, patch);
	}
});

// ---- Internal access for server-side actions (never exposed to clients) ----

export const getInternal = internalQuery({
	args: { id: v.id("connectors") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

/** Pick the first healthy connector for a provider, else the first available. */
export const findForProvider = internalQuery({
	args: { workspaceId: v.id("workspaces"), provider: v.string() },
	handler: async (ctx, { workspaceId, provider }) => {
		const all = await ctx.db
			.query("connectors")
			.withIndex("by_workspace_provider", (q) => q.eq("workspaceId", workspaceId).eq("provider", provider))
			.collect();
		if (all.length === 0) return null;
		const ok = all.find((c) => c.status === "ok");
		return ok ?? all[0];
	}
});

/** Internal bookkeeping: claim a token id for the vault audit log. */
export const _internalRegister = internalMutation({
	args: { id: v.id("connectors"), status: v.string() },
	handler: async (ctx, { id, status }) => {
		await ctx.db.patch(id, { status, lastCheckedAt: Date.now() });
	}
});

export const isGuruKey = (t: string) => t.startsWith(SECRET_PREFIX);
