<script lang="ts">
	import { NAV } from "../nav";
	import { paletteOpen } from "../stores";
	import { goto } from "$app/navigation";

	const open = $derived($paletteOpen);
	let query = $state("");

	const results = $derived(
		query.trim() === ""
			? NAV.slice(0, 8)
			: NAV.filter((n) => `${n.label} ${n.blurb} ${n.group}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
	);

	function go(href: string) {
		paletteOpen.set(false);
		query = "";
		goto(href);
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => paletteOpen.set(false)} aria-label="Close"></button>
		<div class="guru-card relative z-10 w-full max-w-xl overflow-hidden !rounded-xl">
			<input
				class="w-full border-0 bg-transparent px-5 py-4 text-base text-white outline-none placeholder:text-slate-500"
				placeholder="Search modules, pages and commands…"
				bind:value={query}
			/>
			<div class="max-h-80 overflow-y-auto border-t border-indigo-500/10 p-2">
				{#each results as item (item.href)}
					<button class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-indigo-500/15" onclick={() => go(item.href)}>
						<span class="w-5 text-center text-indigo-300">{item.icon}</span>
						<div>
							<p class="text-sm font-medium text-slate-100">{item.label}</p>
							<p class="text-xs text-slate-500">{item.blurb}</p>
						</div>
					</button>
				{:else}
					<p class="px-3 py-6 text-center text-sm text-slate-500">Nothing matches “{query}”.</p>
				{/each}
			</div>
		</div>
	</div>
{/if}
