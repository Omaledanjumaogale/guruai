import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Reverse API Lab — inspired by and harmonized with reverse-api-engineer:
 * capture (HAR) → normalize endpoints → generate a typed API client.
 * Codegen here is deterministic (no key required) with optional LLM polish.
 */

type Endpoint = {
	id: string;
	method: string;
	url: string;
	path: string;
	host: string;
	headers: Record<string, string>;
	query: Record<string, string>;
	bodySample?: string;
	contentType?: string;
	count: number;
};

const REDACT = new Set(["authorization", "cookie", "x-api-key", "api-key", "apikey", "x-auth-token", "proxy-authorization"]);

function normalize(har: any): Endpoint[] {
	const entries: any[] = har?.log?.entries ?? [];
	const byKey = new Map<string, Endpoint>();
	for (const e of entries) {
		const req = e.request;
		if (!req || !req.url) continue;
		let url: URL;
		try {
			url = new URL(req.url);
		} catch {
			continue;
		}
		if (!/^https?:$/.test(url.protocol)) continue;
		const method = (req.method ?? "GET").toUpperCase();
		const path = `${url.pathname.replace(/\/$/, "")}`;
		const key = `${method} ${url.host}${path}`;
		const headers: Record<string, string> = {};
		for (const h of req.headers ?? []) {
			const name = String(h.name).toLowerCase();
			if (REDACT.has(name) || name.startsWith("sec-") || name.startsWith("x-amz")) continue;
			headers[name] = String(h.value).slice(0, 200);
		}
		const query: Record<string, string> = {};
		for (const q of url.searchParams.entries()) query[q[0]] = q[1].slice(0, 200);
		const existing = byKey.get(key);
		const bodySample = typeof req.postData?.text === "string" ? req.postData.text.slice(0, 2000) : undefined;
		if (existing) {
			existing.count++;
		} else {
			byKey.set(key, {
				id: key,
				method,
				url: `${url.origin}${url.pathname}`,
				path,
				host: url.host,
				headers,
				query,
				bodySample,
				contentType: (req.postData?.mimeType ?? req.headers?.find?.((h: any) => String(h.name).toLowerCase() === "content-type")?.value) as string | undefined,
				count: 1
			});
		}
	}
	return [...byKey.values()];
}

export const ingestHar = action({
	args: { workspaceId: v.id("workspaces"), name: v.string(), har: v.string() },
	handler: async (ctx, { workspaceId, name, har }) => {
		let parsed: any;
		try {
			parsed = JSON.parse(har);
		} catch {
			throw new Error("That file is not valid JSON/HAR. Export the HAR from your browser's Network tab and try again.");
		}
		const endpoints = normalize(parsed);
		if (endpoints.length === 0) throw new Error("No HTTP(S) requests found in this HAR capture.");
		const target = parsed.log?.pages?.[0]?.title || (endpoints[0] ? endpoints[0].host : "capture");
		const sessionId = await ctx.runMutation(internal.harInternal.insertSession, {
			workspaceId,
			name,
			targetUrl: String(target),
			endpoints,
			entryCount: endpoints.reduce((n, e) => n + e.count, 0)
		});
		return { sessionId, endpointCount: endpoints.length, hosts: [...new Set(endpoints.map((e) => e.host))] };
	}
});

export const listSessions = query({
	args: { workspaceId: v.id("workspaces") },
	handler: async (ctx, { workspaceId }) =>
		await ctx.db
			.query("harSessions")
			.withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
			.order("desc")
			.collect()
});

export const getSession = query({
	args: { id: v.id("harSessions") },
	handler: async (ctx, { id }) => await ctx.db.get(id)
});

export const removeSession = mutation({
	args: { id: v.id("harSessions") },
	handler: async (ctx, { id }) => {
		const clients = await ctx.db.query("generatedClients").withIndex("by_session", (q) => q.eq("sessionId", id)).collect();
		for (const c of clients) await ctx.db.delete(c._id);
		await ctx.db.delete(id);
	}
});

export const listClients = query({
	args: { sessionId: v.id("harSessions") },
	handler: async (ctx, { sessionId }) =>
		await ctx.db
			.query("generatedClients")
			.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
			.order("desc")
			.collect()
});
