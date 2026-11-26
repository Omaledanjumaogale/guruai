<script lang="ts">
	import { page } from "$app/state";
	import { NAV, GROUPS } from "../nav";
	import { paletteOpen } from "../stores";
	import { account, session, logout } from "../auth";
	import { gq } from "../convex";
	import { can, initials, type Me } from "../access";
	import Logo from "./Logo.svelte";
	import Icon from "./Icon.svelte";
	import ThemeToggle from "./ThemeToggle.svelte";

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
	<button class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onclick={() => (mobileOpen = false)} aria-label="Close menu"></button>
{/if}

<aside
	class="app-sidebar fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col transition-transform lg:translate-x-0 {mobileOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
	aria-label="Primary navigation"
>
	<div class="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4">
		<a href={$account ? "/home" : "/"} class="min-w-0" aria-label="Guru AI home">
			<Logo size={34} tagline="Enterprise AI" />
		</a>
		<ThemeToggle />
	</div>

	<div class="px-3 pt-3">
		<button
			class="flex w-full items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left text-xs text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
			onclick={() => paletteOpen.set(true)}
		>
			<Icon name="keywords" size={14} />
			<span class="flex-1">Search &amp; commands</span>
			<kbd class="rounded border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--muted)]">Ctrl K</kbd>
		</button>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 pb-3">
		{#each groups as entry}
			<p class="nav-section">{entry.group}</p>
			{#each entry.items as item}
				<a
					href={item.href}
					aria-current={active(item.href) ? "page" : undefined}
					class="nav-item {active(item.href) ? 'nav-item-active' : ''}"
					title={item.blurb}
				>
					<span class="nav-icon"><Icon name={item.href} size={15} /></span>
					<span class="flex-1 truncate">{item.label}</span>
					{#if badge(item) > 0}
						<span class="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white" aria-label={`${badge(item)} unread`}>
							{badge(item) > 9 ? "9+" : badge(item)}
						</span>
					{/if}
				</a>
			{/each}
		{/each}
	</nav>

	<div class="space-y-2 border-t border-[var(--line)] px-3 py-3">
		<a
			href="/hub"
			class="group flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2 transition hover:border-[var(--sky)]"
		>
			<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sky-soft)] text-[var(--sky)]"><Icon name="hub" size={14} /></span>
			<span class="min-w-0 flex-1">
				<span class="block text-[11px] font-bold text-[var(--ink)]">E-WIN Hub</span>
				<span class="block truncate text-[9.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Ecosystem identity</span>
			</span>
			<span class="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--sky)]" aria-hidden="true">→</span>
		</a>

		{#if $account}
			<a href="/profile" class="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-[var(--surface-2)]">
				<span class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10.5px] font-extrabold text-[var(--accent)]" aria-hidden="true">{initials($account.name ?? $account.email)}</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-[11.5px] font-bold text-[var(--ink)]">{$account.name ?? $account.email}</span>
					<span class="block truncate text-[9.5px] uppercase tracking-[0.12em] text-[var(--muted)]">{me?.account?.role === "admin" ? "Enterprise workspace" : (me?.plan?.name ?? $account.role)}</span>
				</span>
			</a>
			<div class="flex items-center justify-between px-1.5">
				<a href="/settings" class="text-[10.5px] text-[var(--muted)] transition hover:text-[var(--ink)]">Settings</a>
				<button class="text-[10.5px] text-[var(--muted)] transition hover:text-[var(--accent)]" onclick={() => logout()}>Sign out</button>
			</div>
		{:else}
			<a href="/login" class="guru-btn guru-btn-primary w-full !py-2 !text-xs">
				Sign in <span aria-hidden="true">→</span>
			</a>
		{/if}
	</div>
</aside>

<header class="app-topbar sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden">
	<button
		class="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1.5 text-[var(--ink-soft)]"
		onclick={() => (mobileOpen = true)}
		aria-label="Open menu"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
	</button>
	<a href={$account ? "/home" : "/"} class="min-w-0">
		<Logo size={27} compact tagline="" />
	</a>
	<div class="ml-auto flex items-center gap-2">
		<ThemeToggle />
		{#if $account}
			<a href="/notifications" class="rounded-lg border border-[var(--line)] p-1.5 text-[var(--ink-soft)]" aria-label="Notifications">
				<Icon name="notifications" size={16} />
			</a>
		{:else}
			<a href="/login" class="guru-btn guru-btn-primary !px-3 !py-1.5 !text-[11px]">Sign in</a>
		{/if}
	</div>
</header>
