/**
 * GuruRoute — the harmonized model-routing engine (Not Diamond-style).
 * Scores available providers per task type and returns the best route with a
 * full explanation, so every module (chat, humanizer, agents) picks smartly.
 */

export type RouteCandidate = { provider: string; model: string; label: string };
export type RouteRule = { task: string; provider: string; model: string };
export type RouteResult = { provider: string; model: string; reason: string; ranked: { provider: string; model: string; score: number }[] };

export const TASK_TYPES = [
	{ id: "chat", label: "General chat" },
	{ id: "code", label: "Code & technical" },
	{ id: "writing", label: "Writing & editing" },
	{ id: "analysis", label: "Analysis & research" },
	{ id: "humanize", label: "Humanizing text" },
	{ id: "visual", label: "Diagrams & visuals" },
	{ id: "generation", label: "Media generation" }
];

export const DEFAULT_MODELS: Record<string, RouteCandidate[]> = {
	agnes: [
		{ provider: "agnes", model: "agnes-3.0-flash", label: "Agnes 3.0 Flash (deployment)" },
		{ provider: "agnes", model: "agnes-2.5-pro-alpha", label: "Agnes 2.5 Pro Alpha" },
		{ provider: "agnes", model: "agnes-2.5-pro-theta", label: "Agnes 2.5 Pro Theta" }
	],
	openai: [{ provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini" }],
	anthropic: [{ provider: "anthropic", model: "claude-haiku-4-5", label: "Claude Haiku" }],
	gemini: [{ provider: "gemini", model: "gemini-2.0-flash", label: "Gemini Flash" }],
	openrouter: [{ provider: "openrouter", model: "openrouter/auto", label: "Auto (OpenRouter)" }],
	groq: [{ provider: "groq", model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" }],
	deepai: [{ provider: "deepai", model: "default", label: "DeepAI Chat" }],
	custom: [{ provider: "custom", model: "default", label: "Custom endpoint" }]
};

/** Heuristic task detection from message content. */
export function detectTask(text: string): string {
	const t = text.toLowerCase();
	if (/\b(code|function|bug|typescript|python|api|refactor|sql|regex|stack trace|compile)\b/.test(t)) return "code";
	if (/\b(summar|analy|research|compare|evaluate|pros and cons|report)\b/.test(t)) return "analysis";
	if (/\b(rewrite|polish|humanize|essay|draft|tone|proofread|article|blog)\b/.test(t)) return "writing";
	return "chat";
}

/**
 * Route a task to the best available provider.
 * Priority: explicit user rules > task-fit scoring > availability order.
 */
export function route(
	task: string,
	available: { provider: string; label?: string }[],
	rules: RouteRule[] = [],
	fallbackOrder: string[] = ["openai", "anthropic", "gemini", "groq", "openrouter", "deepai", "custom"]
): RouteResult {
	const avail = new Set(available.map((a) => a.provider));
	const rule = rules.find((r) => r.task === task && avail.has(r.provider));
	if (rule) {
		return {
			provider: rule.provider,
			model: rule.model,
			reason: `Your routing rule sends "${task}" tasks to ${rule.provider}.`,
			ranked: [{ provider: rule.provider, model: rule.model, score: 1 }]
		};
	}
	const TASK_FIT: Record<string, string[]> = {
		code: ["anthropic", "openai", "openrouter", "groq", "gemini"],
		analysis: ["openai", "gemini", "anthropic", "openrouter", "groq"],
		writing: ["anthropic", "openai", "openrouter", "gemini", "groq"],
		humanize: ["anthropic", "openai", "openrouter", "gemini", "groq"],
		visual: ["openai", "gemini", "anthropic", "openrouter", "groq"],
		chat: ["openai", "gemini", "anthropic", "groq", "openrouter", "deepai", "custom"],
		generation: ["deepai", "custom"]
	};
	const order = [...(TASK_FIT[task] ?? fallbackOrder), ...fallbackOrder];
	const ranked = order
		.filter((p, i) => avail.has(p) && order.indexOf(p) === i)
		.map((p, i) => ({ provider: p, model: DEFAULT_MODELS[p]?.[0]?.model ?? "default", score: Number((1 - i / Math.max(order.length, 1)).toFixed(3)) }));
	if (ranked.length === 0) {
		// No vault connectors yet: the deployment engine (Agnes AI) is always available.
		return {
			provider: "agnes",
			model: "agnes-3.0-flash",
			reason: "No connectors in the vault yet — using the deployment engine (Agnes 3.0 Flash).",
			ranked: [{ provider: "agnes", model: "agnes-3.0-flash", score: 1 }]
		};
	}
	return {
		provider: ranked[0].provider,
		model: ranked[0].model,
		reason: `GuruRoute picked ${ranked[0].provider} for "${task}" — best fit among your ${avail.size} connected provider${avail.size === 1 ? "" : "s"}.`,
		ranked
	};
}
