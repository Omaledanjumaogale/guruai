import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";

/** Read routing configuration for the GuruRoute engine. */
export const getRouting = internalQuery({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) => {
		const row = await ctx.db
			.query("settings")
			.withIndex("by_workspace_key", (q) => q.eq("workspaceId", workspaceId).eq("key", "routing.rules"))
			.first();
		return row?.value ?? null;
	}
});

export const readSetting = query({
	args: { workspaceId: v.id("workspaces"), key: v.string() },
	handler: async (ctx, { workspaceId, key }) => {
		const row = await ctx.db
			.query("settings")
			.withIndex("by_workspace_key", (q) => q.eq("workspaceId", workspaceId).eq("key", key))
			.first();
		return row?.value ?? null;
	}
});
