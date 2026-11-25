<script lang="ts">
	import { page } from "$app/state";
	import { NAV, GROUPS } from "../nav";
	import { paletteOpen } from "../stores";
	import { account, logout } from "../auth";

	let mobileOpen = $state(false);
	const current = $derived(page.url.pathname);
	const acc = $account;

	function active(href: string): boolean {
		return href === "/" ? current === "/" : current.startsWith(href);
	}

	$effect(() => {
		mobileOpen = false;
	});
</script>

<!-- Mobile drawer backdrop -->
{#if mobileOpen}
	<button class="fixed inset-0 z-40 bg-black/60 lg:hidden" onclick={() => (mobileOpen = false)} aria-label="Close menu"></button>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-indigo-500/10 bg-ink-950/85 backdrop-blur-xl transition-transform lg:translate-x-0 {mobileOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<div class="flex items-center gap-3 border-b border-indigo-500/10 px-5 py-4">
		<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-bold text-white">G</div>
		<div>
			<p class="text-sm font-bold tracking-wide text-white">Guru <span class="guru-gradient-text">AI</span></p>
			<p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Enterprise workspace</p>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 py-3">
		{#each GROUPS as group}
			<p class="mb-1.5 mt-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group}</p>
			{#each NAV.filter((n) => n.group === group) as item}
				<a
					href={item.href}
					class="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition {active(item.href)
						? 'bg-indigo-500/15 font-semibold text-indigo-200'
						: 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}"
					title={item.blurb}
				>
					<span class="w-4 text-center text-base">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		{/each}
	</nav>

	<div class="mx-3 mb-2 border-t border-indigo-500/10 pt-2">
		{#if $account}
			<div class="flex items-center justify-between gap-2 rounded-lg bg-ink-800/60 px-3 py-2">
				<div class="min-w-0">
					<p class="truncate text-xs font-semibold text-slate-200">{$account.name ?? $account.email}</p>
					<p class="text-[10px] uppercase tracking-wider text-indigo-300">{$account.role} · {$account.provider}</p>
				</div>
				<button class="text-[11px] text-slate-400 hover:text-rose-300" onclick={() => logout()}>Sign out</button>
			</div>
		{:else}
			<a
				href="/login"
				class="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
			>
				<span>Sign in / Create account</span>
				<span aria-hidden="true">→</span>
			</a>
		{/if}
	</div>

	<button class="mx-3 mb-4 flex items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-ink-800/60 px-3 py-2 text-xs text-slate-300 transition hover:bg-ink-700/70" onclick={() => paletteOpen.set(true)}>
		<span>Search & commands</span>
		<kbd class="rounded border border-slate-600 px-1.5 text-[10px] text-slate-400">Ctrl K</kbd>
	</button>
</aside>

<!-- Mobile top bar -->
<div class="sticky top-0 z-30 flex items-center gap-3 border-b border-indigo-500/10 bg-ink-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
	<button class="rounded-lg p-1.5 text-slate-300 hover:bg-white/5" onclick={() => (mobileOpen = true)} aria-label="Open menu">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
	</button>
	<span class="text-sm font-bold text-white">Guru <span class="guru-gradient-text">AI</span></span>
</div>
