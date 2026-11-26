<script lang="ts">
	import "../app.css";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import MobileNav from "$lib/components/MobileNav.svelte";
	import CommandPalette from "$lib/components/CommandPalette.svelte";
	import Toasts from "$lib/components/Toasts.svelte";
	import PwaPrompt from "$lib/components/PwaPrompt.svelte";
	import { bootGuru } from "$lib/stores";
	import { convexReady } from "$lib/convex";
	import { initPwa, initServiceWorker } from "$lib/pwa";
	import { NAV } from "$lib/nav";
	import { page } from "$app/state";

	let { children } = $props();

	const path = $derived(page.url.pathname);
	const isMarketing = $derived(path === "/");
	const isAuth = $derived(path === "/login" || path.startsWith("/login/"));

	const title = $derived(
		(() => {
			if (isMarketing) return "Guru AI — One enterprise workspace for every AI tool";
			const hit = NAV.filter((n) => (n.href === "/" ? path === "/" : path === n.href || path.startsWith(`${n.href}/`))).sort(
				(a, b) => b.href.length - a.href.length
			)[0];
			return hit ? `${hit.label} · Guru AI` : "Guru AI — Enterprise AI Workspace";
		})()
	);

	// Client-only build (ssr=false): boot synchronously at import time.
	bootGuru();
	initPwa();
	initServiceWorker();
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

{#if isMarketing}
	<main id="main" tabindex="-1">
		{@render children()}
	</main>
	<PwaPrompt />
	<Toasts />
{:else if isAuth}
	<main id="main" tabindex="-1">
		{@render children()}
	</main>
	<PwaPrompt />
	<Toasts />
{:else}
	<div class="min-h-screen pb-16 lg:pb-0 lg:pl-[268px]">
		<Sidebar />
		{#if !convexReady}
			<div class="mx-4 mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
				<strong>Backend not connected.</strong> Set <code class="rounded bg-black/30 px-1">VITE_CONVEX_URL</code> to your Convex deployment URL (see Settings → Install &amp; Deploy). The interface still works; data and AI calls need the backend.
			</div>
		{/if}
		<main id="main" tabindex="-1" class="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
			{@render children()}
		</main>
		<MobileNav />
	</div>
	<CommandPalette />
	<PwaPrompt />
	<Toasts />
{/if}