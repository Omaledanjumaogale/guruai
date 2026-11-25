<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { ax } from "$lib/convex";

	const wid = $derived($workspaceId);
	let text = $state("");
	let output = $state("");
	let strength = $state("balanced");
	let tone = $state("");
	let busy = $state(false);

	async function humanize() {
		if (!text.trim() || busy) return;
		busy = true;
		try {
			output = await ax("humanizer.humanize", { workspaceId: wid, text, strength, tone: tone || undefined });
			toastOk("Rewritten");
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader title="Humanizer" blurb="Rewrites AI-generated text so it reads like a skilled human wrote it. Harmonized from WriteHuman and Humbot." />

<div class="grid gap-4 lg:grid-cols-2">
	<div class="guru-card p-5">
		<label class="guru-label" for="src">AI text to humanize</label>
		<textarea id="src" class="guru-input min-h-[240px]" placeholder="Paste your AI-drafted article, email or report…" bind:value={text}></textarea>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			<div>
				<label class="guru-label" for="strength">Rewrite strength</label>
				<select id="strength" class="guru-input" bind:value={strength}>
					<option value="light">Light — subtle polish</option>
					<option value="balanced">Balanced — recommended</option>
					<option value="strong">Strong — full rewrite</option>
				</select>
			</div>
			<div>
				<label class="guru-label" for="tone">Tone (optional)</label>
				<input id="tone" class="guru-input" placeholder="e.g. warm, executive, plain English" bind:value={tone} />
			</div>
		</div>
		<button class="guru-btn guru-btn-primary mt-4 w-full" disabled={busy || !text.trim()} onclick={humanize}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Rewriting…{:else}Humanize{/if}
		</button>
	</div>

	<div class="guru-card p-5">
		<div class="flex items-center justify-between">
			<label class="guru-label" for="out">Human version</label>
			{#if output}
				<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={() => navigator.clipboard.writeText(output)}>Copy</button>
			{/if}
		</div>
		{#if output}
			<div id="out" class="min-h-[240px] whitespace-pre-wrap rounded-lg bg-ink-950/60 p-3 text-[14.5px] leading-relaxed text-slate-200">{output}</div>
		{:else}
			<div class="flex min-h-[240px] items-center justify-center rounded-lg bg-ink-950/60 text-sm text-slate-500">The humanized text lands here.</div>
		{/if}
	</div>
</div>
