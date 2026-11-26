<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		title,
		blurb,
		eyebrow = "",
		children,
		actions = null
	}: { title: string; blurb?: string; eyebrow?: string; children?: Snippet; actions?: Snippet | null } = $props();
</script>

<header class="mb-6 flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
	<div class="min-w-0">
		{#if eyebrow}<p class="eyebrow mb-2">{eyebrow}</p>{/if}
		<h1 class="text-[26px] font-extrabold leading-[1.12] tracking-[-0.025em] text-[var(--ink)] sm:text-[30px]">{title}</h1>
		{#if blurb}<p class="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">{blurb}</p>{/if}
		{@render children?.()}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{@render actions()}</div>
	{/if}
</header>
