import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { chatWithConnector, loadConnector, connectorOrEnv } from "./ai";
import type { Id } from "./_generated/dataModel";

/** Visuals — harmonized with Napkin AI: turn text into a structured diagram spec the app renders as SVG. */

const SPEC_SYSTEM = `You convert text into a diagram spec. Return ONLY minified JSON, no markdown fences, matching:
{"title":string,"nodes":[{"id":string,"label":string,"x":number,"y":number,"shape":"rect"|"pill"|"diamond"|"circle"}],"edges":[{"from":string,"to":string,"label":string?}],"layout":"flow"|"map"|"compare"}
Coordinates: x in 40..860, y in 40..560. Space nodes at least 130px apart horizontally, 90px vertically. Keep 4-14 nodes. Derive nodes from the key entities/steps of the input text; edges from logical flow.`;

export const generateVisual = action({
	args: { workspaceId: v.id("workspaces"), text: v.string(), style: v.optional(v.string()), provider: v.optional(v.string()), model: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const start = Date.now();
		const provider = args.provider ?? "openai";
		const conn = await connectorOrEnv(ctx, args.workspaceId, provider);
		let spec: any;
		if (conn) {
			try {
				const out = await chatWithConnector(conn as any, [
					{ role: "system", content: SPEC_SYSTEM },
					{ role: "user", content: args.text }
				], args.model ?? "");
				spec = parseSpec(out.text);
			} catch {
				spec = null;
			}
		}
		if (!spec) spec = heuristicSpec(args.text);
		await ctx.runMutation(internal.usage.record, { workspaceId: args.workspaceId, module: "visuals", action: "generate", ok: true, ms: Date.now() - start });
		return spec;
	}
});

function parseSpec(text: string): any | null {
	try {
		const json = text.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
		const start = json.indexOf("{");
		const end = json.lastIndexOf("}");
		const spec = JSON.parse(json.slice(start, end + 1));
		if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges)) return null;
		return spec;
	} catch {
		return null;
	}
}

/** Deterministic fallback: bullets/lines become a flowchart — works with zero keys. */
function heuristicSpec(text: string): any {
	const lines = text
		.split(/\n|(?<=[.!?])\s+/)
		.map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
		.filter((l) => l.length > 2)
		.slice(0, 10);
	const nodes = lines.map((label, i) => ({
		id: `n${i}`,
		label: label.length > 46 ? `${label.slice(0, 44)}…` : label,
		x: i % 2 === 0 ? 200 : 620,
		y: 70 + Math.floor(i / 2) * 110,
		shape: i === 0 ? "pill" : "rect"
	}));
	const edges = nodes.slice(0, -1).map((n, i) => ({ from: n.id, to: nodes[i + 1].id }));
	return { title: "Visual", nodes, edges, layout: "flow" };
}