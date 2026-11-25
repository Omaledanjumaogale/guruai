import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getInternal = internalQuery({
	args: { id: v.id("agents") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

export const insertRun = internalMutation({
	args: { agentId: v.id("agents"), workspaceId: v.id("workspaces") },
	handler: async (ctx, args) => {
		return ctx.db.insert("agentRuns", { ...args, status: "running", log: [], startedAt: Date.now() });
	}
});

export const appendRunEntry = internalMutation({
	args: { runId: v.id("agentRuns"), entry: v.object({ stepId: v.string(), stepName: v.string(), status: v.string(), output: v.optional(v.string()), error: v.optional(v.string()), at: v.number() }) },
	handler: async (ctx, { runId, entry }) => {
		const run = await ctx.db.get(runId);
		if (!run) return;
		await ctx.db.patch(runId, { log: [...run.log, entry] });
	}
});

export const finishRun = internalMutation({
	args: { runId: v.id("agentRuns"), status: v.string() },
	handler: async (ctx, { runId, status }) => {
		await ctx.db.patch(runId, { status, finishedAt: Date.now() });
	}
});

export const insertNote = internalMutation({
	args: { workspaceId: v.id("workspaces"), title: v.string(), body: v.string(), color: v.optional(v.string()) },
	handler: async (ctx, { workspaceId, title, body, color }) => {
		const now = Date.now();
		return ctx.db.insert("notes", { workspaceId, title, body, color: color ?? "default", pinned: false, archived: false, tags: ["agent"], createdAt: now, updatedAt: now });
	}
});
