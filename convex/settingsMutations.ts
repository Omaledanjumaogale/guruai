import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Store routing rules for the GuruRoute engine (Not Diamond-style model selection). */
export const setSetting = mutation({
	args: { workspaceId: v.id("workspaces"), key: v.string(), value: v.any() },
	handler: async (ctx, { workspaceId, key, value }) => {
		const row = await ctx.db
			.query("settings")
			.withIndex("by_workspace_key", (q) => q.eq("workspaceId", workspaceId).eq("key", key))
			.first();
		if (row) await ctx.db.patch(row._id, { value });
		else await ctx.db.insert("settings", { workspaceId, key, value });
	}
});
