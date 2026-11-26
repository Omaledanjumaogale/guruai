<script lang="ts">
	import { installPrompt, installed, installDismissed, online, updateReady, dismissInstall, promptInstall, applyUpdate } from "$lib/pwa";

	const showInstall = $derived($installPrompt !== null && !$installed && !$installDismissed);
</script>

{#if !$online}
	<div class="fixed bottom-20 left-1/2 z-40 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink)] shadow-2xl backdrop-blur lg:bottom-5">
		<strong class="font-semibold">You are offline.</strong> Cached pages still open; data and AI calls resume when the connection returns.
	</div>
{/if}

{#if $updateReady}
	<div class="fixed bottom-20 left-1/2 z-40 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink)] shadow-2xl backdrop-blur lg:bottom-5">
		<span class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-[var(--green)]"></span>A new Guru AI build is ready.</span>
		<button class="guru-btn guru-btn-primary !px-3 !py-1.5 !text-xs" onclick={applyUpdate}>Reload</button>
	</div>
{/if}

{#if showInstall}
	<div class="fixed bottom-36 left-1/2 z-40 flex w-[min(92vw,520px)] -translate-x-1/2 items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-2xl backdrop-blur lg:bottom-5 lg:left-auto lg:right-5 lg:translate-x-0">
		<div>
			<p class="text-sm font-bold text-[var(--ink)]">Install Guru AI</p>
			<p class="mt-0.5 text-[11.5px] text-[var(--muted)]">A full-screen workspace with an offline shell.</p>
		</div>
		<div class="flex shrink-0 items-center gap-1.5">
			<button class="guru-btn guru-btn-primary !px-3 !py-1.5 !text-xs" onclick={async () => { if (!(await promptInstall())) dismissInstall(); }}>Install</button>
			<button class="rounded-lg p-1.5 text-[var(--muted)] transition hover:text-[var(--ink)]" onclick={dismissInstall} aria-label="Dismiss install prompt">✕</button>
		</div>
	</div>
{/if}