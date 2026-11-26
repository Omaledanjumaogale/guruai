<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import BrandBanner from "$lib/components/BrandBanner.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, ax, mx } from "$lib/convex";

	const wid = $derived($workspaceId);
	let seed = $state("");
	let busy = $state(false);
	let result = $state<any>(null);
	let S_history = $derived(wid ? gq("keywords.list", { workspaceId: wid, limit: 8 }) : null);
	let history = $derived(S_history ? $S_history : null);

	async function research() {
		if (!seed.trim() || busy) return;
		busy = true;
		try {
			result = await ax("keywords.generateKeywords", { workspaceId: wid, seed, enrich: true });
			await mx("keywords.create", { workspaceId: wid, seed, country: "en", questions: result.questions, prepositions: result.prepositions, comparisons: result.comparisons });
			toastOk("Keyword map ready");
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}

	function downloadCsv() {
		if (!result) return;
		const rows: string[] = ["bucket,query"];
		for (const [w, list] of Object.entries(result.questions)) for (const q of list as string[]) rows.push(`question,"${q}"`);
		for (const [w, list] of Object.entries(result.prepositions)) for (const q of list as string[]) rows.push(`preposition,"${q}"`);
		for (const [w, list] of Object.entries(result.comparisons)) for (const q of list as string[]) rows.push(`comparison,"${q}"`);
		for (const q of result.modifiers ?? []) rows.push(`modifier,"${q}"`);
		for (const q of result.aiIdeas ?? []) rows.push(`ai,"${q}"`);
		const blob = new Blob([rows.join("\n")], { type: "text/csv" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${seed.replace(/\W+/g, "-")}-keywords.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<PageHeader title="Keyword Intelligence" blurb="A seed keyword expands into the questions, prepositions and comparisons real searchers use — harmonized from AnswerThePublic." />

<BrandBanner name="keywords" />

<div class="guru-card mb-4 p-5">
	<form class="flex flex-wrap items-end gap-3" onsubmit={(e) => { e.preventDefault(); research(); }}>
		<div class="min-w-52 flex-1">
			<label class="guru-label" for="seed">Seed keyword</label>
			<input id="seed" class="guru-input" placeholder="e.g. project management software" bind:value={seed} />
		</div>
		<button class="guru-btn guru-btn-primary" type="submit" disabled={busy || !seed.trim()}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span>{:else}Expand keyword{/if}
		</button>
		{#if result}
			<button class="guru-btn guru-btn-ghost" type="button" onclick={downloadCsv}>⬇ CSV</button>
		{/if}
	</form>
</div>

{#if result}
	<div class="space-y-4">
		{#if result.aiIdeas?.length}
			<div class="guru-card p-5">
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-300">✦ AI long-tail ideas</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each result.aiIdeas as q (q)}
						<span class="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100">{q}</span>
					{/each}
				</div>
			</div>
		{/if}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<div class="guru-card p-5">
				<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-300">? Questions</h2>
				{#each Object.entries(result.questions) as [w, list], i (w)}
					<div class="mb-3">
						<p class="text-xs font-bold uppercase text-slate-500">{w}</p>
						<ul class="mt-1 space-y-0.5">
							{#each (list as string[]) as q (q)}
								<li class="rounded bg-ink-850/60 px-2 py-1 text-[13px] text-slate-300">{q}</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
			<div class="guru-card p-5">
				<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-300">⇄ Prepositions</h2>
				{#each Object.entries(result.prepositions) as [w, list] (w)}
					<p class="mb-1 text-[13px] text-slate-300"><span class="font-semibold text-slate-500">{w}</span> — {(list as string[]).join(" · ")}</p>
				{/each}
			</div>
			<div class="guru-card p-5">
				<h2 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-300">⚖ Comparisons & modifiers</h2>
				{#each Object.entries(result.comparisons) as [w, list] (w)}
					<p class="mb-1 text-[13px] text-slate-300"><span class="font-semibold text-slate-500">{w}</span> — {(list as string[]).join(" · ")}</p>
				{/each}
				<div class="mt-2 flex flex-wrap gap-1">
					{#each result.modifiers as q (q)}
						<span class="rounded bg-ink-850/70 px-2 py-0.5 text-[11px] text-slate-400">{q}</span>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if history?.length}
	<section class="mt-6">
		<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Saved research</h2>
		<div class="flex flex-wrap gap-2">
			{#each history as h (h._id)}
				<button class="rounded-full border border-indigo-500/20 bg-ink-850/60 px-3 py-1 text-xs text-slate-300 hover:border-indigo-400/50" onclick={() => { seed = h.seed; research(); }}>
					{h.seed} <span class="text-slate-500">· {new Date(h.createdAt).toLocaleDateString()}</span>
				</button>
			{/each}
		</div>
	</section>
{/if}
