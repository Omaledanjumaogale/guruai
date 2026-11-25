import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const storeCandidates = internalMutation({
	args: {
		workspaceId: v.id("workspaces"),
		sourceLabel: v.string(),
		candidates: v.array(
			v.object({
				provider: v.string(),
				providerGuess: v.string(),
				keyEnvName: v.string(),
				baseUrl: v.optional(v.string()),
				snippet: v.string(),
				confidence: v.number(),
				token: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, { workspaceId, sourceLabel, candidates }) => {
		const ids: string[] = [];
		for (const c of candidates) {
			const id = await ctx.db.insert("connectorCandidates", {
				workspaceId,
				sourceLabel,
				provider: c.provider,
				providerGuess: c.providerGuess,
				keyEnvName: c.keyEnvName,
				baseUrl: c.baseUrl,
				snippet: c.snippet,
				confidence: c.confidence,
				status: "pending",
				token: c.token,
				createdAt: Date.now()
			});
			ids.push(id);
		}
		return ids;
	}
});

export const noopMutation = mutation({
	args: {},
	handler: async () => true
});
