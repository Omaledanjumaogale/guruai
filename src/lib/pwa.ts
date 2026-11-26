import { writable, get } from "svelte/store";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export const installPrompt = writable<InstallPromptEvent | null>(null);
export const installed = writable(false);
export const online = writable(true);
export const updateReady = writable(false);
export const installDismissed = writable(false);

const DISMISS_KEY = "guru.pwa.dismissed";

/** Wires install, connectivity and update signals exactly once. */
export function initPwa(): void {
	if (typeof window === "undefined" || (window as any).__guruPwa) return;
	(window as any).__guruPwa = true;

	installDismissed.set(localStorage.getItem(DISMISS_KEY) === "1");
	installed.set(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as any).standalone));
	online.set(navigator.onLine);

	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		installPrompt.set(event as InstallPromptEvent);
	});
	window.addEventListener("appinstalled", () => {
		installed.set(true);
		installPrompt.set(null);
	});
	window.addEventListener("online", () => online.set(true));
	window.addEventListener("offline", () => online.set(false));
}

export function dismissInstall(): void {
	installDismissed.set(true);
	localStorage.setItem(DISMISS_KEY, "1");
}

/** Resolves true when the visitor accepted the native install prompt. */
export async function promptInstall(): Promise<boolean> {
	const event = get(installPrompt);
	if (!event) return false;
	await event.prompt();
	const choice = await event.userChoice;
	if (choice.outcome === "accepted") {
		installPrompt.set(null);
		dismissInstall();
		return true;
	}
	return false;
}

/** Registers the offline shell and surfaces a waiting update without forcing a reload. */
export function initServiceWorker(): void {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
	navigator.serviceWorker
		.register("/sw.js", { updateViaCache: "none" })
		.then((registration) => {
			if (registration.waiting) updateReady.set(true);
			registration.addEventListener("updatefound", () => {
				const worker = registration.installing;
				worker?.addEventListener("statechange", () => {
					if (worker.state === "installed" && navigator.serviceWorker.controller) updateReady.set(true);
				});
			});
		})
		.catch(() => {});
}

export async function applyUpdate(): Promise<void> {
	const registration = await navigator.serviceWorker.getRegistration();
	registration?.waiting?.postMessage("SKIP_WAITING");
	setTimeout(() => window.location.reload(), 400);
}