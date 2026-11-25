import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/** Get (or lazily create) the workspace bound to a client device key. */
export const ensure = mutation({
	args: { deviceKey: v.string(), name: v.optional(v.string()) },
	handler: async (ctx, { deviceKey, name }) => {
		const existing = await ctx.db
			.query("workspaces")
			.withIndex("by_device", (q) => q.eq("deviceKey", deviceKey))
			.first();
		if (existing) return existing._id;
		return ctx.db.insert("workspaces", {
			deviceKey,
			name: name ?? "My Workspace",
			createdAt: Date.now()
		});
	}
});

export const get = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => await ctx.db.get(workspaceId)
});

export const rename = mutation({
	args: { workspaceId: v.id("workspaces"), name: v.string() },
	handler: async (ctx, { workspaceId, name }) => {
		await ctx.db.patch(workspaceId, { name });
	}
});

/** Internal helper used by seed logic. */
export const _internalTouch = internalMutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		await ctx.db.patch(workspaceId, { createdAt: Date.now() });
	}
});
