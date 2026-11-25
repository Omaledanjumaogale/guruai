<script lang="ts">
	import "../app.css";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import CommandPalette from "$lib/components/CommandPalette.svelte";
	import Toasts from "$lib/components/Toasts.svelte";
	import { bootGuru } from "$lib/stores";
	import { convexReady } from "$lib/convex";
	import { NAV } from "$lib/nav";
	import { page } from "$app/state";

	let { children } = $props();

	const title = $derived(
		(() => {
			const path = page.url.pathname;
			const hit = NAV.filter((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href))).sort(
				(a, b) => b.href.length - a.href.length
			)[0];
			return hit ? `${hit.label} · Guru AI` : "Guru AI — Enterprise AI Workspace";
		})()
	);

	// Client-only build (ssr=false): boot synchronously at import time.
	bootGuru();
	if ("serviceWorker" in navigator) {
		// updateViaCache: "none" makes the browser re-check sw.js on every load so a
		// deploy replaces the cached shell instead of serving stale markup.
		navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="min-h-screen lg:pl-64">
	<Sidebar />
	{#if !convexReady}
		<div class="mx-4 mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
			<strong>Backend not connected.</strong> Set <code class="rounded bg-black/30 px-1">VITE_CONVEX_URL</code> to your Convex deployment URL (see Settings → Install &amp; Deploy). The interface still works; data and AI calls need the backend.
		</div>
	{/if}
	<main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
		{@render children()}
	</main>
</div>

<CommandPalette />
<Toasts />
