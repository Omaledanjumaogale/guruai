import { writable, type Writable } from "svelte/store";
import { anyApi } from "convex/server";
import type { FunctionReference } from "convex/server";
import * as mocks from "./mock";

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

export async function initConvex(): Promise<void> {
	if (!convexReady) return;
	if (!httpClient) {
		const mod = await import("convex/browser");
		httpClient = new mod.ConvexHttpClient(CONVEX_URL);
		liveClient = new mod.ConvexClient(CONVEX_URL);
	}
}

function http(): import("convex/browser").ConvexHttpClient {
	if (!httpClient) throw new Error("Backend not connected. Set VITE_CONVEX_URL to your Convex deployment URL (see Settings).");
	return httpClient;
}

/** Live reactive query: use in components as `$gq("agents.list", args)`. */
export function gq<T = any>(path: string, args: Record<string, unknown> = {}): Writable<T | null> {
	if (!convexReady) {
		// Demo data until the backend connects; live data replaces it automatically.
		const seed = (mocks.MOCKS as any)[path] ?? null;
		return writable<T | null>(seed as T);
	}
	const store = writable<T | null>(null, () => {
		let unsub: { unsubscribe: () => void } | null = null;
		if (liveClient) {
			try {
				const [table, fn] = path.split(".");
				const ref: FunctionReference<any> = ANY[table][fn];
				unsub = liveClient!.onUpdate(ref, args as any, (value: any) => store.set(value as T));
			} catch (e) {
				console.warn(`convex watch failed for ${path}`, e);
			}
		}
		return () => unsub?.unsubscribe();
	});
	return store;
}

/** One-shot query (not live). */
export async function qq<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	const [table, fn] = path.split(".");
	return (await http().query(ANY[table][fn], args)) as T;
}

/** Mutation. */
export async function mx<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	const [table, fn] = path.split(".");
	return (await http().mutation(ANY[table][fn], args)) as T;
}

/** Server action (calls external APIs, runs agent steps, codegen...). */
export async function ax<T = any>(path: string, args: Record<string, unknown> = {}): Promise<T> {
	const [table, fn] = path.split(".");
	return (await http().action(ANY[table][fn], args)) as T;
}
