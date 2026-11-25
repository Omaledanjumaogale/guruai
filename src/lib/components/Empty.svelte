<script lang="ts">
	let { icon = "◌", title, blurb = "" } = $props();
</script>

<div class="guru-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
	<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl text-indigo-300">{icon}</div>
	<h3 class="text-base font-semibold text-slate-200">{title}</h3>
	{#if blurb}
		<p class="max-w-md text-sm leading-relaxed text-slate-400">{blurb}</p>
	{/if}
</div>
