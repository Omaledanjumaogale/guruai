import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getSessionInternal = internalQuery({
	args: { id: v.id("harSessions") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

export const insertSession = internalMutation({
	args: {
		workspaceId: v.id("workspaces"),
		name: v.string(),
		targetUrl: v.string(),
		endpoints: v.any(),
		entryCount: v.number()
	},
	handler: async (ctx, args) => {
		return ctx.db.insert("harSessions", { ...args, createdAt: Date.now() });
	}
});

export const insertClient = internalMutation({
	args: { sessionId: v.id("harSessions"), workspaceId: v.id("workspaces"), language: v.string(), code: v.string(), generatedBy: v.string() },
	handler: async (ctx, args) => {
		return ctx.db.insert("generatedClients", { ...args, createdAt: Date.now() });
	}
});
