<script lang="ts">
	let { open = $bindable(false), title = "", children, wide = false } = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => (open = false)} aria-label="Close dialog"></button>
		<div class="guru-card relative z-10 max-h-[85vh] w-full overflow-y-auto p-5 {wide ? 'max-w-3xl' : 'max-w-lg'}">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-white">{title}</h2>
				<button class="text-slate-400 hover:text-white" onclick={() => (open = false)} aria-label="Close">×</button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}
