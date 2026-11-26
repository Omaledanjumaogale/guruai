<script lang="ts">
	import { installPrompt, installed, installDismissed, online, updateReady, dismissInstall, promptInstall, applyUpdate } from "$lib/pwa";

	const showInstall = $derived($installPrompt !== null && !$installed && !$installDismissed);
</script>

{#if !$online}
	<div class="fixed bottom-20 left-1/2 z-40 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-amber-400/30 bg-[#1a1408]/95 px-4 py-3 text-xs text-amber-100 shadow-2xl backdrop-blur lg:bottom-5">
		<strong class="font-semibold">You are offline.</strong> Cached pages still open; data and AI calls resume when the connection returns.
	</div>
{/if}

{#if $updateReady}
	<div class="fixed bottom-20 left-1/2 z-40 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-indigo-400/30 bg-[#101018]/95 px-4 py-3 text-xs text-indigo-100 shadow-2xl backdrop-blur lg:bottom-5">
		<span>A new Guru AI build is ready.</span>
		<button class="guru-btn guru-btn-primary !px-3 !py-1.5 !text-xs" onclick={applyUpdate}>Reload</button>
	</div>
{/if}

{#if showInstall}
	<div class="fixed bottom-36 left-1/2 z-40 flex w-[min(92vw,520px)] -translate-x-1/2 items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#101018]/95 px-4 py-3 shadow-2xl backdrop-blur lg:bottom-5 lg:left-auto lg:right-5 lg:translate-x-0">
		<div>
			<p class="text-sm font-semibold text-white">Install Guru AI</p>
			<p class="mt-0.5 text-xs text-slate-400">A full-screen workspace with an offline shell.</p>
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			<button class="guru-btn guru-btn-primary !px-3 !py-1.5 !text-xs" onclick={async () => { if (!(await promptInstall())) dismissInstall(); }}>Install</button>
			<button class="rounded-lg p-1.5 text-slate-400 hover:text-white" onclick={dismissInstall} aria-label="Dismiss install prompt">✕</button>
		</div>
	</div>
{/if}