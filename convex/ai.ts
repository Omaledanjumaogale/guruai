import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Guru AI provider engine.
 * Every connector holds a key the workspace owner supplied (manual entry or
 * discovered from their own repos by the Reverse API extractor). Actions read
 * tokens server-side only and never return them to clients.
 */

type Connector = {
	_id: Id<"connectors">;
	provider: string;
	label: string;
	baseUrl?: string;
	token: string;
	status: string;
	lastError?: string;
};

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_BASES: Record<string, string> = {
	openai: "https://api.openai.com/v1",
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
	deepai: "https://api.deepai.org",
	anthropic: "https://api.anthropic.com",
	gemini: "https://generativelanguage.googleapis.com",
	agnes: "https://apihub.agnes-ai.com/v1"
};

async function loadConnector(ctx: any, workspaceId: string, provider: string): Promise<Connector> {
	const c = await ctx.runQuery(internal.connectors.findForProvider, { workspaceId, provider });
	if (c) return c as Connector;
	// Deployment-level fallback: the Agnes AI engine works even with an empty vault.
	if (process.env.AGNES_AI_KEY) {
		return {
			_id: "env:agnes" as any,
			provider: "agnes",
			label: "Agnes AI (deployment engine)",
			baseUrl: process.env.AGNES_BASE_URL || DEFAULT_BASES.agnes,
			token: process.env.AGNES_AI_KEY,
			status: "ok"
		};
	}
	throw new Error(`No "${provider}" connector configured. Add a key in the Connector Vault (Settings → Connectors) or connect one from the Reverse API Lab.`);
}

async function mark(ctx: any, id: string, status: string, lastError?: string) {
	try {
		await ctx.runMutation(internal.connectors._internalRegister, { id, status });
	} catch {
		/* non-fatal */
	}
}

// ---------------------------------------------------------------- chat ----

export async function chatWithConnector(conn: Connector, messages: ChatMsg[], model: string): Promise<{ text: string; tokens: number }> {
	const base = (conn.baseUrl && conn.baseUrl.trim()) || DEFAULT_BASES[conn.provider] || DEFAULT_BASES.openai;
	if (conn.provider === "agnes") {
		// Agnes AI hub is OpenAI-compatible.
		const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${conn.token}` },
			body: JSON.stringify({ model: model || "gpt-4o-mini", messages, max_tokens: 4096 })
		});
		if (!res.ok) throw new Error(`Agnes AI failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		return { text: data.choices?.[0]?.message?.content ?? "", tokens: data.usage?.total_tokens ?? 0 };
	}
	if (conn.provider === "deepai") {
		// DeepAI chat is a single-turn style endpoint; flatten the transcript.
		const text = messages.map((m) => (m.role === "user" ? `User: ${m.content}` : m.role === "assistant" ? `Guru: ${m.content}` : `System: ${m.content}`)).join("\n\n");
		const res = await fetch(`${base}/chat`, {
			method: "POST",
			headers: { "content-type": "application/json", "api-key": conn.token },
			body: JSON.stringify({ text })
		});
		if (!res.ok) throw new Error(`DeepAI chat failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		return { text: data.reply ?? data.output ?? "", tokens: data.total ?? 0 };
	}
	if (conn.provider === "anthropic") {
		const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
		const rest = messages.filter((m) => m.role !== "system");
		const res = await fetch(`${base}/v1/messages`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-api-key": conn.token, "anthropic-version": "2023-06-01" },
			body: JSON.stringify({ model: model || "claude-haiku-4-5", max_tokens: 4096, system: system || undefined, messages: rest.map((m) => ({ role: m.role, content: m.content })) })
		});
		if (!res.ok) throw new Error(`Anthropic failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		return { text: (data.content ?? []).map((c: any) => c.text ?? "").join(""), tokens: data.usage?.output_tokens ?? 0 };
	}
	if (conn.provider === "gemini") {
		const modelId = (model || "gemini-2.0-flash").replace(/^models\//, "");
		const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
		const contents = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
		const res = await fetch(`${base}/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(conn.token)}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ contents, systemInstruction: sys ? { parts: [{ text: sys }] } : undefined })
		});
		if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
		const data = await res.json();
		const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
		return { text, tokens: data.usageMetadata?.totalTokenCount ?? 0 };
	}
	// OpenAI-compatible: openai, openrouter, groq, custom.
	const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
		method: "POST",
		headers: { "content-type": "application/json", authorization: `Bearer ${conn.token}` },
		body: JSON.stringify({ model: model || "gpt-4o-mini", messages, max_tokens: 4096 })
	});
	if (!res.ok) throw new Error(`Chat failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
	const data = await res.json();
	return { text: data.choices?.[0]?.message?.content ?? "", tokens: data.usage?.total_tokens ?? 0 };
}

/** Render a chat answer through the routed provider. */
export const chat = action({
	args: {
		workspaceId: v.id("workspaces"),
		messages: v.array(v.object({ role: v.string(), content: v.string() })),
		provider: v.optional(v.string()),
		model: v.optional(v.string())
	},
	handler: async (ctx, args): Promise<{ text: string; provider: string; model: string; tokens: number }> => {
		const start = Date.now();
		const provider = args.provider ?? "agnes";
		const conn = await loadConnector(ctx, args.workspaceId, provider);
		try {
			const out = await chatWithConnector(conn, args.messages as ChatMsg[], args.model ?? "");
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "chat", action: "chat", provider, model: args.model, ok: true, ms: Date.now() - start });
			return { text: out.text, provider, model: args.model ?? "default", tokens: out.tokens };
		} catch (e: any) {
			await mark(ctx, conn._id, "error", String(e).slice(0, 200));
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "chat", action: "chat", provider, ok: false, ms: Date.now() - start });
			throw e;
		}
	}
});

/** One-shot completion used by humanizer, visual spec generation, agents, etc. */
export const complete = action({
	args: {
		workspaceId: v.id("workspaces"),
		system: v.optional(v.string()),
		prompt: v.string(),
		provider: v.optional(v.string()),
		model: v.optional(v.string()),
		maxTokensHint: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<string> => {
		const provider = args.provider ?? "agnes";
		const conn = await loadConnector(ctx, args.workspaceId, provider);
		const messages: ChatMsg[] = [
			...(args.system ? [{ role: "system" as const, content: args.system }] : []),
			{ role: "user" as const, content: args.prompt }
		];
		return (await chatWithConnector(conn, messages, args.model ?? "")).text;
	}
});

// ------------------------------------------------------- generation studio ----

/** DeepAI text2img / text2video style endpoint caller. */
async function deepaiGenerate(conn: Connector, endpoint: string, fields: Record<string, string>): Promise<{ outputUrl?: string; raw?: any }> {
	const form = new FormData();
	for (const [k, val] of Object.entries(fields)) form.append(k, val);
	const res = await fetch(`https://api.deepai.org/api/${endpoint}`, {
		method: "POST",
		headers: { "api-key": conn.token },
		body: form
	});
	if (!res.ok) throw new Error(`DeepAI ${endpoint} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
	const data = await res.json();
	return { outputUrl: data.output_url ?? data.output?.[0], raw: data };
}

export const generateImage = action({
	args: { workspaceId: v.id("workspaces"), prompt: v.string(), style: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const start = Date.now();
		const conn = await loadConnector(ctx, args.workspaceId, "deepai");
		try {
			const text = args.style && args.style !== "none" ? `${args.prompt}. Style: ${args.style}` : args.prompt;
			const out = await deepaiGenerate(conn, "text2img", { text });
			await mark(ctx, conn._id, "ok");
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "images", action: "text2img", provider: "deepai", ok: true, ms: Date.now() - start });
			return { url: out.outputUrl ?? null, raw: out.raw ?? null };
		} catch (e: any) {
			await mark(ctx, conn._id, "error", String(e).slice(0, 200));
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "images", action: "text2img", ok: false, ms: Date.now() - start });
			throw e;
		}
	}
});

export const generateVideo = action({
	args: { workspaceId: v.id("workspaces"), prompt: v.string() },
	handler: async (ctx, args) => {
		const start = Date.now();
		const conn = await loadConnector(ctx, args.workspaceId, "deepai");
		try {
			let out = await deepaiGenerate(conn, "text2video", { text: args.prompt }).catch(() => null);
			if (!out?.outputUrl) out = await deepaiGenerate(conn, "video-generation", { prompt: args.prompt });
			await mark(ctx, conn._id, "ok");
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "video", action: "generate", provider: "deepai", ok: true, ms: Date.now() - start });
			return { url: out.outputUrl ?? null, raw: out.raw ?? null };
		} catch (e: any) {
			await mark(ctx, conn._id, "error", String(e).slice(0, 200));
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "video", action: "generate", ok: false, ms: Date.now() - start });
			throw e;
		}
	}
});

export const generateMusic = action({
	args: { workspaceId: v.id("workspaces"), prompt: v.string(), genre: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const start = Date.now();
		// Music can be served by any connector exposing an OpenAI-compatible or
		// DeepAI-style audio endpoint; default is a DeepAI key with the music API.
		const conn = await loadConnector(ctx, args.workspaceId, "music");
		try {
			const base = conn.baseUrl || "https://api.deepai.org";
			const form = new FormData();
			form.append("text", `${args.prompt}${args.genre ? `. Genre: ${args.genre}` : ""}`);
			const res = await fetch(`${base}/api/text-to-music`, { method: "POST", headers: { "api-key": conn.token }, body: form });
			if (!res.ok) throw new Error(`Music API failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
			const data = await res.json();
			await mark(ctx, conn._id, "ok");
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "music", action: "generate", provider: "music", ok: true, ms: Date.now() - start });
			return { url: data.output_url ?? data.output?.[0] ?? null, raw: data };
		} catch (e: any) {
			await mark(ctx, conn._id, "error", String(e).slice(0, 200));
			await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "music", action: "generate", ok: false, ms: Date.now() - start });
			throw e;
		}
	}
});

/** Test a connector with a cheap call. */
export const testConnector = action({
	args: { connectorId: v.id("connectors") },
	handler: async (ctx, { connectorId }) => {
		const conn = (await ctx.runQuery(internal.connectors.getInternal, { id: connectorId })) as Connector | null;
		if (!conn) throw new Error("Connector not found");
		try {
			if (conn.provider === "deepai") {
				const res = await fetch("https://api.deepai.org/usage?verbose=1", { headers: { "api-key": conn.token } });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
			} else {
				await chatWithConnector(conn, [{ role: "user", content: "Reply with the single word: ready" }], "");
			}
			await mark(ctx, conn._id, "ok");
			return { ok: true, message: "Connector is live." };
		} catch (e: any) {
			await mark(ctx, conn._id, "error", String(e).slice(0, 200));
			return { ok: false, message: String(e.message ?? e).slice(0, 300) };
		}
	}
});
