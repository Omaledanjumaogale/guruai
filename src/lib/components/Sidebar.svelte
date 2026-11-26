<script lang="ts">
	import { page } from "$app/state";
	import { NAV, GROUPS } from "../nav";
	import { paletteOpen } from "../stores";
	import { account, session, logout } from "../auth";
	import { gq } from "../convex";
	import { can, initials, type Me } from "../access";

	let mobileOpen = $state(false);
	const current = $derived(page.url.pathname);
	const acc = $account;

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_inbox = $derived($session ? gq<number>("messaging.unread", { token: $session }) : null);
	const inboxUnread = $derived(S_inbox ? Number($S_inbox ?? 0) : 0);

	function visible(item: (typeof NAV)[number]): boolean {
		if (item.authOnly && !$session) return false;
		if (item.permission && !can(me, item.permission)) return false;
		return true;
	}

	const groups = $derived(
		GROUPS.map((group) => ({ group, items: NAV.filter((item) => item.group === group && visible(item)) })).filter(
			(entry) => entry.items.length > 0
		)
	);

	function active(href: string): boolean {
		return href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
	}

	function badge(item: (typeof NAV)[number]): number {
		if (item.href === "/inbox") return inboxUnread;
		if (item.href === "/notifications") return me?.unreadNotifications ?? 0;
		return 0;
	}

	$effect(() => {
		mobileOpen = false;
	});
</script>

{#if mobileOpen}
	<button class="fixed inset-0 z-40 bg-black/70 lg:hidden" onclick={() => (mobileOpen = false)} aria-label="Close menu"></button>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/8 bg-[#08080a]/95 backdrop-blur-xl transition-transform lg:translate-x-0 {mobileOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
	aria-label="Primary navigation"
>
	<a href="/" class="flex items-center gap-3 border-b border-white/8 px-5 py-4">
		<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-bold text-white">G</div>
		<div>
			<p class="text-sm font-bold tracking-wide text-white">Guru <span class="guru-gradient-text">AI</span></p>
			<p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Enterprise workspace</p>
		</div>
	</a>

	<nav class="flex-1 overflow-y-auto px-3 py-2">
		{#each groups as entry}
			<p class="mb-1.5 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.group}</p>
			{#each entry.items as item}
				<a
					href={item.href}
					aria-current={active(item.href) ? "page" : undefined}
					class="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition {active(item.href)
						? 'bg-indigo-500/15 font-semibold text-indigo-200'
						: 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}"
					title={item.blurb}
				>
					<span class="w-4 text-center text-base" aria-hidden="true">{item.icon}</span>
					<span class="flex-1 truncate">{item.label}</span>
					{#if badge(item) > 0}
						<span class="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label="{badge(item)} unread">{badge(item) > 9 ? "9+" : badge(item)}</span>
					{/if}
				</a>
			{/each}
		{/each}
	</nav>

	<div class="mx-3 mb-2 border-t border-white/8 pt-2">
		{#if $account}
			<a href="/profile" class="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white/5">
				<span class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/25 text-[11px] font-bold text-indigo-100" aria-hidden="true">{initials($account.name ?? $account.email)}</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-xs font-semibold text-slate-200">{$account.name ?? $account.email}</span>
					<span class="block truncate text-[10px] uppercase tracking-wider text-indigo-300">{me?.plan?.name ?? $account.role}</span>
				</span>
			</a>
			<div class="mt-1 flex items-center justify-between px-2 pb-1">
				<a href="/subscription" class="text-[11px] text-slate-400 hover:text-indigo-200">Plan &amp; usage</a>
				<button class="text-[11px] text-slate-400 hover:text-rose-300" onclick={() => logout()}>Sign out</button>
			</div>
		{:else}
			<a href="/login" class="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20">
				<span>Sign in / Create account</span>
				<span aria-hidden="true">→</span>
			</a>
		{/if}
	</div>

	<button class="mx-3 mb-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.07]" onclick={() => paletteOpen.set(true)}>
		<span>Search &amp; commands</span>
		<kbd class="rounded border border-slate-600 px-1.5 text-[10px] text-slate-400">Ctrl K</kbd>
	</button>
</aside>

<div class="sticky top-0 z-30 flex items-center gap-3 border-b border-white/8 bg-[#08080a]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
	<button class="rounded-lg p-1.5 text-slate-300 hover:bg-white/5" onclick={() => (mobileOpen = true)} aria-label="Open menu">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
	</button>
	<a href="/" class="text-sm font-bold text-white">Guru <span class="guru-gradient-text">AI</span></a>
	{#if $account}<a href="/notifications" class="ml-auto text-xs text-slate-300">Alerts</a>{:else}<a href="/login" class="ml-auto text-xs font-semibold text-indigo-300">Sign in</a>{/if}
</div>