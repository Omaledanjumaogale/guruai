import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
	args: {
		workspaceId: v.id("workspaces"),
		name: v.string(),
		description: v.optional(v.string()),
		steps: v.array(v.object({ id: v.string(), type: v.string(), name: v.string(), config: v.any() }))
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return ctx.db.insert("agents", { ...args, description: args.description ?? "", enabled: true, createdAt: now, updatedAt: now });
	}
});

export const update = mutation({
	args: {
		id: v.id("agents"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		steps: v.optional(v.array(v.object({ id: v.string(), type: v.string(), name: v.string(), config: v.any() }))),
		enabled: v.optional(v.boolean())
	},
	handler: async (ctx, { id, ...patch }) => {
		await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
	}
});

export const remove = mutation({
	args: { id: v.id("agents") },
	handler: async (ctx, { id }) => {
		const runs = await ctx.db.query("agentRuns").withIndex("by_agent", (q) => q.eq("agentId", id)).collect();
		for (const r of runs) await ctx.db.delete(r._id);
		await ctx.db.delete(id);
	}
});

export const list = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) =>
		await ctx.db
			.query("agents")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.collect()
});

export const get = query({
	args: { id: v.id("agents") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

// ---- runs ----

export const startRun = mutation({
	args: { agentId: v.id("agents"), workspaceId: v.id("workspaces") },
	handler: async (ctx, { agentId, workspaceId }) => {
		return ctx.db.insert("agentRuns", { agentId, workspaceId, status: "running", log: [], startedAt: Date.now() });
	}
});

export const appendLog = mutation({
	args: { runId: v.id("agentRuns"), entry: v.object({ stepId: v.string(), stepName: v.string(), status: v.string(), output: v.optional(v.string()), error: v.optional(v.string()), at: v.number() }) },
	handler: async (ctx, { runId, entry }) => {
		const run = await ctx.db.get(runId);
		if (!run) return;
		await ctx.db.patch(runId, { log: [...run.log, entry] });
	}
});

export const finishRun = mutation({
	args: { runId: v.id("agentRuns"), status: v.string() },
	handler: async (ctx, { runId, status }) => {
		await ctx.db.patch(runId, { status, finishedAt: Date.now() });
	}
});

export const runsFor = query({
	args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
	handler: async (ctx, { agentId, limit }) =>
		await ctx.db
			.query("agentRuns")
			.withIndex("by_agent", (q) => q.eq("agentId", agentId))
			.order("desc")
			.take(limit ?? 10)
});

export const allRuns = query({
	args: { workspaceId: v.id("workspaces"), limit: v.optional(v.number()) },
	handler: async (ctx, { workspaceId, limit }) =>
		await ctx.db
			.query("agentRuns")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.take(limit ?? 20)
});
