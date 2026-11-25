import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		title: v.optional(v.string()),
		body: v.optional(v.string()),
		color: v.optional(v.string()),
		tags: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return ctx.db.insert("notes", {
			workspaceId: args.workspaceId,
			title: args.title ?? "",
			body: args.body ?? "",
			color: args.color ?? "default",
			pinned: false,
			archived: false,
			tags: args.tags ?? [],
			createdAt: now,
			updatedAt: now
		});
	}
});

export const update = mutation({
	args: { id: v.id("notes"), title: v.optional(v.string()), body: v.optional(v.string()), color: v.optional(v.string()), pinned: v.optional(v.boolean()), archived: v.optional(v.boolean()), tags: v.optional(v.array(v.string())) },
	handler: async (ctx, { id, ...patch }) => {
		await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
	}
});

export const remove = mutation({
	args: { id: v.id("notes") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces"), archived: v.optional(v.boolean()) },
	handler: async (ctx, { workspaceId, archived }) => {
		const all = await ctx.db
			.query("notes")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.filter((q) => q.eq(q.field("archived"), archived ?? false))
			.collect();
		// Pinned first, then most recently updated.
		return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
	}
});
