import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		videoId: v.string(),
		url: v.string(),
		title: v.string(),
		language: v.string(),
		content: v.string(),
		segments: v.optional(v.any())
	},
	handler: async (ctx, args) => {
		return ctx.db.insert("transcripts", { ...args, createdAt: Date.now() });
	}
});

export const setSummary = mutation({
	args: { id: v.id("transcripts"), summary: v.string() },
	handler: async (ctx, { id, summary }) => {
		await ctx.db.patch(id, { summary });
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
	handler: async (ctx, { workspaceId, limit }) =>
		await ctx.db
			.query("transcripts")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.take(limit ?? 40)
});

export const get = query({
	args: { id: v.id("transcripts") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

export const remove = mutation({
	args: { id: v.id("transcripts") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	}
});
