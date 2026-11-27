import { writable, type Writable } from "svelte/store";
import { anyApi } from "convex/server";
import type { FunctionReference } from "convex/server";

/**
 * Live bridge between Svelte stores and the Convex backend.
 * Falls back gracefully (with a visible banner) when VITE_CONVEX_URL is not set.
 */

export const CONVEX_URL: string = (import.meta.env.VITE_CONVEX_URL as string) ?? "";
export const convexReady = /^https?:\/\/.+/.test(CONVEX_URL) && !CONVEX_URL.includes("not-configured");

const ANY: any = anyApi;

// Lazily create the clients: HTTP for one-shot calls, WebSocket for live queries.
let httpClient: import("convex/browser").ConvexHttpClient | null = null;
let liveClient: import("convex/browser").ConvexClient | null = null;
let initPromise: Promise<void> | null = null;

export function initConvex(): Promise<void> {
	if (!convexReady) return Promise.resolve();
	if (httpClient) return Promise.resolve();
	if (!initPromise) {
		initPromise = (async () => {
			const mod = await import("convex/browser");
			httpClient = new mod.ConvexHttpClient(CONVEX_URL);
			liveClient = new mod.ConvexClient(CONVEX_URL);
		})();
	}
	return initPromise;
}

function http(): import("convex/browser").ConvexHttpClient {
	if (!httpClient) throw new Error("Backend not connected. Set VITE_CONVEX_URL to your Convex deployment URL (see Settings).");
	return httpClient;
}

/**
 * Live reactive query: use in components as `$gq("agents.list", args)`.
 * Stores are cached per query+args so the subscription survives re-renders,
 * and the first value arrives even when the client initialises after mount.
 */
const liveStores = new Map<string, Writable<any>>();

export function gq<T = any>(path: string, args: Record<string, unknown> = {}): Writable<T | null> {
	if (!convexReady) {
		// Never render synthetic records in a real workspace. Components show their
		// own empty/error state until a verified backend connection is available.
		return writable<T | null>(null);
	}
	const key = `${path}|${JSON.stringify(args)}`;
	const cached = liveStores.get(key);
	if (cached) return cached;
	const [table, fn] = path.split(".");
	const store = writable<T | null>(null, (set) => {
		let unsub: { unsubscribe: () => void } | null = null;
		let stopped = false;
		(async () => {
			try {
				await initConvex();
				if (stopped || !liveClient) return;
				const ref: FunctionReference<any> = ANY[table][fn];
				unsub = liveClient.onUpdate(ref, args as any, (value: any) => set(value as T));
			} catch (e) {
				console.warn(`convex watch failed for ${path}`, e);
			}
		})();
		return () => {
			stopped = true;
			unsub?.unsubscribe();
			liveStores.delete(key);
		};
	});
	liveStores.set(key, store);
	return store;
}

/** One-shot query (not live). */
export async function qq<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	await initConvex();
	const [table, fn] = path.split(".");
	return (await http().query(ANY[table][fn], args)) as T;
}

/** Mutation. */
export async function mx<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	await initConvex();
	const [table, fn] = path.split(".");
	return (await http().mutation(ANY[table][fn], args)) as T;
}

/**
 * Server action (calls external APIs, runs agent steps, codegen...).
 * Calls the HTTP action endpoint directly: the JS client sends variadic args,
 * and Convex drops ConvexError data for that encoding — so every action failure
 * would surface as a bare "[Request ID] Server Error". Plain JSON keeps the real
 * message ("DeepAI rejected that API key…", "No captions…", and so on).
 */
export async function ax<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	await initConvex();
	if (!convexReady) throw new Error("Backend not connected. Set VITE_CONVEX_URL to your Convex deployment URL (see Settings).");
	const res = await fetch(`${CONVEX_URL}/api/action`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ path: path.replace(".", ":"), args, format: "json" })
	});
	const text = await res.text();
	let body: any;
	try {
		body = JSON.parse(text);
	} catch {
		throw new Error(`Action ${path} failed (${res.status}): ${text.slice(0, 200)}`);
	}
	if (body?.status === "success") return body.value as T;
	const message = typeof body?.errorData === "string" ? body.errorData : body?.errorMessage;
	throw new Error(String(message ?? `Action ${path} failed`));
}