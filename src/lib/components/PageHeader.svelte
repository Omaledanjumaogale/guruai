<script lang="ts">
	let { title, blurb = "", children, actions = null } = $props();
</script>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
		{#if blurb}
			<p class="mt-1 max-w-2xl text-sm text-slate-400">{blurb}</p>
		{/if}
	</div>
	<div class="flex items-center gap-2">{@render children?.()}{#if actions}{@render actions()}{/if}</div>
</header>
