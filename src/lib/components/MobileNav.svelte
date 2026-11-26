<script lang="ts">
	import { page } from "$app/state";
	import { MOBILE_NAV } from "../nav";
	import { session } from "../auth";
	import { gq } from "../convex";
	import { can, type Me } from "../access";
	import Icon from "./Icon.svelte";

	const current = $derived(page.url.pathname);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_inbox = $derived($session ? gq<number>("messaging.unread", { token: $session }) : null);
	const items = $derived(MOBILE_NAV.filter((item) => (!item.authOnly || $session) && (!item.permission || can(me, item.permission))));
</script>

<nav class="app-topbar fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
	<ul class="flex items-stretch justify-around">
		{#each items as item}
			{@const active = item.href === "/home" ? current === "/home" : current.startsWith(item.href)}
			<li class="flex-1">
				<a
					href={item.href}
					aria-current={active ? "page" : undefined}
					class="relative flex flex-col items-center gap-1 px-1 py-2.5 text-[9.5px] font-semibold tracking-wide {active
						? 'text-[var(--accent)]'
						: 'text-[var(--muted)]'}"
				>
					<span class="flex h-6 w-9 items-center justify-center rounded-full {active ? 'bg-[var(--accent-soft)]' : ''}">
						<Icon name={item.href} size={17} />
					</span>
					<span class="truncate">{item.label === "Dashboard" ? "Home" : item.label}</span>
					{#if item.href === "/inbox" && $S_inbox}
						<span class="absolute right-[27%] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--sky)]"></span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>
