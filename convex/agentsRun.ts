import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatWithConnector } from "./ai";
import type { Id } from "./_generated/dataModel";

/** Agents — harmonized with Lindy: multi-step agent workflows executed server-side with a full run log. */

const STEP_TYPES = [
	{ type: "prompt", label: "AI prompt step" },
	{ type: "humanize", label: "Humanize text" },
	{ type: "keywords", label: "Keyword research" },
	{ type: "visual", label: "Build a visual/diagram" },
	{ type: "note", label: "Create a note" },
	{ type: "http", label: "Call an HTTP endpoint" }
];
void STEP_TYPES;

export const runAgent = action({
	args: { agentId: v.id("agents"), workspaceId: v.id("workspaces"), input: v.optional(v.string()) },
	handler: async (ctx, { agentId, workspaceId, input }) => {
		const agent = (await ctx.runQuery(internal.agentsInternal.getInternal, { id: agentId })) as any;
		if (!agent) throw new Error("Agent not found.");
		const runId = await ctx.runMutation(internal.agentsInternal.insertRun, { agentId, workspaceId });
		let carry = input ?? "";
		let ok = true;
		for (const step of agent.steps ?? []) {
			try {
				const output = await runStep(ctx, workspaceId, step, carry);
				carry = output;
				await ctx.runMutation(internal.agentsInternal.appendRunEntry, {
					runId,
					entry: { stepId: step.id, stepName: step.name, status: "ok", output: String(output).slice(0, 4000), at: Date.now() }
				});
			} catch (e: any) {
				ok = false;
				await ctx.runMutation(internal.agentsInternal.appendRunEntry, {
					runId,
					entry: { stepId: step.id, stepName: step.name, status: "error", error: String(e?.message ?? e).slice(0, 500), at: Date.now() }
				});
				break;
			}
		}
		await ctx.runMutation(internal.agentsInternal.finishRun, { runId, status: ok ? "done" : "error" });
		await ctx.runMutation(internal.usage.record, { workspaceId, module: "agents", action: "run", ok, agent: agent.name });
		return { runId, ok, output: carry };
	}
});

async function runStep(ctx: any, workspaceId: string, step: any, carry: string): Promise<string> {
	const cfg = step.config ?? {};
	switch (step.type) {
		case "prompt": {
			const conn = await ctx.runQuery(internal.connectors.findForProvider, { workspaceId, provider: cfg.provider ?? "openai" });
			if (!conn) throw new Error(`No "${cfg.provider ?? "openai"}" connector for the AI step.`);
			const out = await chatWithConnector(conn as any, [
				{ role: "system", content: cfg.system ?? "You are a capable enterprise assistant. Be concise and useful." },
				{ role: "user", content: (cfg.prompt ?? "{input}").replace(/\{input\}/g, carry || "Nothing provided") }
			], cfg.model ?? "");
			return out.text;
		}
		case "humanize": {
			const conn = await ctx.runQuery(internal.connectors.findForProvider, { workspaceId, provider: cfg.provider ?? "openai" });
			if (!conn) throw new Error(`No "${cfg.provider ?? "openai"}" connector for the humanize step.`);
			const out = await chatWithConnector(conn as any, [
				{ role: "system", content: "Rewrite the text so it reads naturally human-written. Output only the rewritten text." },
				{ role: "user", content: carry || cfg.text || "Nothing to humanize." }
			], cfg.model ?? "");
			return out.text;
		}
		case "keywords": {
			const res = await ctx.runAction(internal.keywords.generateKeywords, { workspaceId, seed: carry || cfg.seed || "guru ai", enrich: false });
			return JSON.stringify(res, null, 1);
		}
		case "visual": {
			const res = await ctx.runAction(internal.visuals.generateVisual, { workspaceId, text: carry || cfg.text || "no input" });
			return JSON.stringify(res).slice(0, 4000);
		}
		case "note": {
			await ctx.runMutation(internal.agentsInternal.insertNote, {
				workspaceId,
				title: (cfg.title ?? "Agent note").replace(/\{input\}/g, carry.slice(0, 60)),
				body: carry,
				color: cfg.color ?? "default"
			});
			return `Note saved: ${(cfg.title ?? "Agent note").replace(/\{input\}/g, carry.slice(0, 60))}`;
		}
		case "http": {
			if (!cfg.url) throw new Error("HTTP step needs a URL.");
			const res = await fetch(cfg.url, {
				method: cfg.method ?? "GET",
				headers: { "content-type": "application/json", ...(cfg.headers ?? {}) },
				body: cfg.body ? String(cfg.body).replace(/\{input\}/g, carry) : undefined
			});
			const text = (await res.text()).slice(0, 4000);
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
			return text;
		}
		default:
			throw new Error(`Unknown step type "${step.type}".`);
	}
}
