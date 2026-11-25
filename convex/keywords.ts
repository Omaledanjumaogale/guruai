import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/** Keyword intelligence — harmonized with AnswerThePublic: seed → question clusters, prepositions, comparisons. */

const QUESTION_WORDS = ["how", "what", "why", "when", "who", "which", "where", "can", "does", "is", "will", "should", "are"];
const PREPOSITIONS = ["with", "without", "for", "to", "near", "versus", "like", "about"];
const COMPARISON_WORDS = ["vs", "or", "versus", "compare", "and"];
const MODIFIERS = ["best", "top", "free", "online", "tool", "guide", "software", "app", "tips", "checklist", "examples", "alternatives", "pricing", "review", "tutorial"];

export const generateKeywords = action({
	args: { workspaceId: v.id("workspaces"), seed: v.string(), country: v.optional(v.string()), enrich: v.optional(v.boolean()), provider: v.optional(v.string()), model: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const start = Date.now();
		const seed = args.seed.trim().toLowerCase();
		if (!seed) throw new Error("Enter a seed keyword.");
		const questions: Record<string, string[]> = {};
		for (const w of QUESTION_WORDS) {
			questions[w] = [
				`${w} ${seed} works`,
				`${w} ${seed} is best`,
				`${w} ${seed} helps teams`,
				`${w} to start with ${seed}`,
				`${w} ${seed} compares to tools`,
				`${w} ${seed} pricing works`,
				`${w} people choose ${seed}`
			].slice(0, 4);
		}
		const prepositions: Record<string, string[]> = {};
		for (const p of PREPOSITIONS) {
			prepositions[p] = [`${seed} ${p} teams`, `${seed} ${p} beginners`, `${seed} ${p} 2026`, `${seed} ${p} workflows`];
		}
		const comparisons: Record<string, string[]> = {};
		for (const c of COMPARISON_WORDS) {
			comparisons[c] = [`${seed} ${c} competitors`, `${seed} ${c} alternatives`, `${MODIFIERS[0]} ${seed} ${c} tools`];
		}
		const modifiers = MODIFIERS.map((m) => `${m} ${seed}`);

		let aiIdeas: string[] = [];
		if (args.enrich !== false) {
			const { connectorOrEnv } = await import("./ai");
			const conn = await connectorOrEnv(ctx, args.workspaceId, args.provider ?? "openai");
			if (conn) {
				try {
					const { chatWithConnector } = await import("./ai");
					const out = await chatWithConnector(conn as any, [
						{ role: "system", content: "You are a keyword research engine. Return ONLY 20 newline-separated search query strings people actually type, mixing questions, comparisons and long-tail variants for the seed. No numbering, no commentary." },
						{ role: "user", content: seed }
					], args.model ?? "");
					aiIdeas = out.text.split("\n").map((l) => l.replace(/^[-*\d.)\s]+/, "").trim()).filter((l) => l.length > 3).slice(0, 20);
				} catch {
					aiIdeas = [];
				}
			}
		}

		await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "keywords", action: "research", ok: true, ms: Date.now() - start });
		return { questions, prepositions, comparisons, modifiers, aiIdeas };
	}
});
