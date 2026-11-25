import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatWithConnector, loadConnector } from "./ai";
import type { Id } from "./_generated/dataModel";

/** Humanizer — harmonized with WriteHuman / Humbot: rewrite AI-sounding text into natural human prose. */

const LEVELS: Record<string, string> = {
	light: "Lightly adjust phrasing. Preserve meaning and most wording; only smooth obvious AI patterns.",
	balanced: "Rewrite sentence structures, vary rhythm and vocabulary, keep all facts and tone professional.",
	strong: "Thoroughly rewrite. New sentence structures, varied rhythm, contractions where natural, human asides, keep every fact."
};

export const humanize = action({
	args: {
		workspaceId: v.id("workspaces"),
		text: v.string(),
		strength: v.optional(v.string()),
		tone: v.optional(v.string()),
		provider: v.optional(v.string()),
		model: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const start = Date.now();
		const provider = args.provider ?? "openai";
		const conn = await loadConnector(ctx, args.workspaceId, provider);
		const strength = LEVELS[args.strength ?? "balanced"] ?? LEVELS.balanced;
		const system = `You are an expert human editor. Rewrite AI-generated text so it reads naturally written by a skilled human. ${strength} ${args.tone ? `Target tone: ${args.tone}.` : ""} Rules: never invent facts; never add meta commentary; output ONLY the rewritten text; keep formatting (headings, lists) intact; vary sentence length; remove boilerplate AI phrases like "delve", "in today's fast-paced world", "it is important to note".`;
		try {
			const out = await chatWithConnector(conn as any, [
				{ role: "system", content: system },
				{ role: "user", content: args.text }
			], args.model ?? "");
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "humanizer", action: "humanize", provider, ok: true, ms: Date.now() - start });
			return out.text;
		} catch (e: any) {
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "humanizer", action: "humanize", ok: false, ms: Date.now() - start });
			throw e;
		}
	}
});
