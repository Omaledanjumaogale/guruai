import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		prompt: v.string(),
		kind: v.string(),
		params: v.optional(v.any()),
		status: v.string()
	},
	handler: async (ctx, args) => {
		return ctx.db.insert("generations", { ...args, params: args.params ?? {}, createdAt: Date.now() });
	}
});

export const finish = mutation({
	args: { id: v.id("generations"), status: v.string(), resultUrl: v.optional(v.string()), resultData: v.optional(v.any()), error: v.optional(v.string()) },
	handler: async (ctx, { id, status, resultUrl, resultData, error }) => {
		await ctx.db.patch(id, { status, resultUrl, resultData, error });
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces"), kind: v.optional(v.string()), limit: v.optional(v.number()) },
	handler: async (ctx, { workspaceId, kind, limit }) => {
		const all = await ctx.db
			.query("generations")
			.withIndex("by_workspace_kind", (q) => q.eq("workspaceId", workspaceId).eq("kind", kind ?? "image"))
			.order("desc")
			.collect();
		if (kind) return all.slice(0, limit ?? 30);
		const everything = await ctx.db
			.query("generations")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.collect();
		return everything.slice(0, limit ?? 30);
	}
});

export const remove = mutation({
	args: { id: v.id("generations") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	}
});
