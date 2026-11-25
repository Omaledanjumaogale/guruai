import { writable, get } from "svelte/store";
import { mx, convexReady } from "./convex";

/** Boot lifecycle: false until workspace + auth are initialized. */
export const booted = writable(false);

/** Workspace identity — a device key identifies this install/workspace. */
const KEY_STORE = "guru.workspace.id";
const DEVICE_STORE = "guru.workspace.device";

function makeDeviceKey(): string {
	return `dev_${crypto.randomUUID().replace(/-/g, "")}`;
}

export const deviceKey = writable<string>(localStorage.getItem(DEVICE_STORE) ?? "");
export const workspaceId = writable<string>(localStorage.getItem(KEY_STORE) ?? "");
export const workspaceName = writable<string>("My Workspace");

export async function ensureWorkspace(): Promise<string> {
	if (!convexReady) throw new Error("Backend not configured — working offline shell.");
	let dev = get(deviceKey);
	if (!dev) {
		dev = makeDeviceKey();
		localStorage.setItem(DEVICE_STORE, dev);
		deviceKey.set(dev);
	}
	let wid = get(workspaceId);
	if (!wid) {
		wid = (await mx("workspaces.ensure", { deviceKey: dev })) as unknown as string;
		localStorage.setItem(KEY_STORE, wid);
		workspaceId.set(wid);
	}
	return wid;
}

// ------------------------------------------------------------ toasts ----
export type Toast = { id: number; kind: "ok" | "error" | "info"; text: string };
export const toasts = writable<Toast[]>([]);

let seq = 1;
export function toast(kind: Toast["kind"], text: string, ms = 4200) {
	const id = seq++;
	toasts.update((t) => [...t, { id, kind, text }]);
	setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), ms);
}
export const toastOk = (t: string) => toast("ok", t);
/** Human-readable message for any thrown value (ConvexError data beats the wrapped message). */
export function errorText(e: unknown): string {
	const data = (e as { data?: unknown } | null)?.data;
	const raw =
		typeof data === "string" && data.trim()
			? data
			: e instanceof Error
				? e.message
				: String(e);
	return raw
		.replace(/^\[Request ID:[^\]]*\]\s*/i, "")
		.replace(/Uncaught (Convex)?Error:\s*/i, "")
		.replace(/Server Error\s*/i, "")
		.replace(/\s+/g, " ")
		.trim();
}

export const toastErr = (e: unknown) => {
	toast("error", errorText(e).slice(0, 300) || "Something went wrong. Please try again.");
};

// ---------------------------------------------------- command palette ----
export const paletteOpen = writable(false);

/** Run once per page load: backend → workspace → auth. */
let bootedOnce = false;
export async function bootGuru(): Promise<void> {
	if (bootedOnce) { (window as any).__boot = "already"; return; }
	bootedOnce = true;
	(window as any).__boot = "started";
	try {
		const { initConvex } = await import("./convex");
		const { initAuth } = await import("./auth");
		await initConvex();
		await ensureWorkspace();
		await initAuth();
		const wid = get(workspaceId);
		if (wid && convexReady) {
			try {
				const { qq } = await import("./convex");
				const name = await qq<{ value: any } | null>("settings.readSetting", { workspaceId: wid, key: "workspace.name" });
				if (name?.value) workspaceName.set(name.value);
			} catch {
				/* non-fatal */
			}
		}
	} catch (e) {
		console.warn("[guru] boot", e);
	} finally {
		(window as any).__boot = "settled";
		booted.set(true);
	}
}