<script lang="ts">
	import { page } from "$app/state";
	import { MOBILE_NAV } from "../nav";
	import { session } from "../auth";
	import { gq } from "../convex";
	import { can, type Me } from "../access";

	const current = $derived(page.url.pathname);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_inbox = $derived($session ? gq<number>("messaging.unread", { token: $session }) : null);
	const items = $derived(MOBILE_NAV.filter((item) => (!item.authOnly || $session) && (!item.permission || can(me, item.permission))));
</script>

<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08080a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Quick navigation">
	<ul class="flex items-stretch justify-around">
		{#each items as item}
			{@const active = item.href === "/home" ? current === "/home" : current.startsWith(item.href)}
			<li class="flex-1">
				<a href={item.href} aria-current={active ? "page" : undefined} class="relative flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] {active ? "text-indigo-200" : "text-slate-400"}">
					<span class="text-base" aria-hidden="true">{item.icon}</span>
					<span class="truncate">{item.label === "Dashboard" ? "Home" : item.label}</span>
					{#if item.href === "/inbox" && $S_inbox}<span class="absolute right-[22%] top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400"></span>{/if}
				</a>
			</li>
		{/each}
	</ul>
</nav>