<script lang="ts">
	import { toasts } from "../stores";
</script>

<div class="fixed bottom-4 right-4 z-[80] flex w-80 flex-col gap-2">
	{#each $toasts as t (t.id)}
		<div
			class="guru-card flex items-start gap-2 px-3.5 py-3 text-sm shadow-xl {t.kind === 'ok' ? 'border-emerald-400/40' : t.kind === 'error' ? 'border-rose-400/40' : 'border-indigo-400/40'}"
			
			
			
		>
			<span class="mt-0.5">{t.kind === "ok" ? "✔" : t.kind === "error" ? "✖" : "ℹ"}</span>
			<p class="flex-1 leading-snug text-slate-200">{t.text}</p>
			<button
				class="text-slate-500 transition hover:text-slate-200"
				onclick={() => toasts.update((all) => all.filter((x) => x.id !== t.id))}
				aria-label="Dismiss"
				>×</button
			>
		</div>
	{/each}
</div>
