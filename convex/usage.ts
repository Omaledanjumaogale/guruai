import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/** Usage telemetry powering the dashboard activity feed. */
export const record = internalMutation({
	args: {
		workspaceId: v.id("workspaces"),
		module: v.string(),
		action: v.string(),
		provider: v.optional(v.string()),
		model: v.optional(v.string()),
		ok: v.boolean(),
		ms: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("usageEvents", { ...args, createdAt: Date.now() });
	}
});

export const recent = query({
	args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
	handler: async (ctx, { workspaceId, limit }) =>
		await ctx.db
			.query("usageEvents")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.take(limit ?? 50)
});

export const counts = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		const events = await ctx.db
			.query("usageEvents")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.collect();
		const byModule: Record<string, number> = {};
		let ok = 0;
		let failed = 0;
		for (const e of events) {
			byModule[e.module] = (byModule[e.module] ?? 0) + 1;
			if (e.ok) ok++;
			else failed++;
		}
		return { total: events.length, ok, failed, byModule };
	}
});

export const clearForWorkspace = mutation({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		const events = await ctx.db
			.query("usageEvents")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.collect();
		for (const e of events) await ctx.db.delete(e._id);
	}
});
