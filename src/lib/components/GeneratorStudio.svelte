<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Empty from "$lib/components/Empty.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, mx, ax } from "$lib/convex";
	

	let { kind = "image", title = "", blurb = "", engine = "deepai", provider = "deepai", placeholder = "", styles = [] } = $props();

	const wid = $derived($workspaceId);
	const S_items = $derived(wid ? gq("generations.list", { workspaceId: wid, kind: kind, limit: 24 }) : null);
	const items = $derived(S_items ? $S_items : null);

	let prompt = $state("");
	let style = $state("none");
	let busy = $state(false);
	let lastError = $state("");

	async function run() {
		const text = prompt.trim();
		if (!text || busy) return;
		busy = true;
		lastError = "";
		const pendingId = await mx("generations.create", { workspaceId: wid, kind, prompt: text, status: "pending", params: { style } });
		try {
			const actionPath = engine === "deepai" && kind === "image" ? "ai.generateImage" : engine === "deepai" && kind === "video" ? "ai.generateVideo" : "ai.generateMusic";
			const out = await ax<any>(actionPath, { workspaceId: wid, prompt: text, style, genre: style });
			if (!out?.url) throw new Error("The engine returned no output URL. Check the connector key and try again.");
			await mx("generations.finish", { id: pendingId, status: "done", resultUrl: out.url });
			toastOk("Generation complete");
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
			await mx("generations.finish", { id: pendingId, status: "error", error: lastError });
			toastErr(e);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader {title} {blurb}>
	{#snippet children()}
		<span class="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">Engine: {engine}</span>
	{/snippet}
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[340px_1fr]">
	<div class="guru-card h-fit p-5">
		<div class="mb-1">
			<label class="guru-label" for="prompt">Prompt</label>
			<textarea id="prompt" class="guru-input min-h-[110px]" placeholder={placeholder} bind:value={prompt}></textarea>
		</div>
		{#if styles.length}
			<div class="mt-3">
				<label class="guru-label" for="style">Style</label>
				<select id="style" class="guru-input" bind:value={style}>
					<option value="none">Default</option>
					{#each styles as s (s)}
						<option value={s}>{s}</option>
					{/each}
				</select>
			</div>
		{/if}
		<button class="guru-btn guru-btn-primary mt-4 w-full" disabled={busy || !prompt.trim()} onclick={run}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Generating…{:else}Generate{/if}
		</button>
		{#if lastError}
			<p class="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-2.5 text-xs leading-relaxed text-rose-200">{lastError}</p>
		{/if}
		<p class="mt-3 text-[11px] leading-relaxed text-slate-500">Runs through your {engine} connector in the Connector Vault. Results are saved to your workspace history.</p>
	</div>

	<div>
		{#if !items?.length}
			<Empty icon="▦" title="Nothing generated yet" blurb={`Your ${kind} generations appear here as a gallery, saved in your workspace.`} />
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each items as g (g._id)}
					<div class="guru-card group overflow-hidden">
						{#if g.status === "done" && g.resultUrl}
							{#if kind === "image"}
								<img src={g.resultUrl} alt={g.prompt} class="aspect-square w-full object-cover" loading="lazy" />
							{:else if kind === "video"}
								<video src={g.resultUrl} controls class="w-full bg-black"></video>
							{:else}
								<audio src={g.resultUrl} controls class="w-full p-3"></audio>
							{/if}
						{:else}
							<div class="flex aspect-square items-center justify-center bg-ink-950/60 text-sm {g.status === 'pending' ? 'guru-pulse text-amber-200' : 'text-rose-300'}">
								{g.status === "pending" ? "Generating…" : "Failed"}
							</div>
						{/if}
						<div class="flex items-center justify-between gap-2 px-3 py-2">
							<p class="line-clamp-2 text-xs text-slate-400" title={g.prompt}>{g.prompt}</p>
							{#if g.resultUrl}
								<a class="text-xs text-indigo-300 hover:underline" href={g.resultUrl} target="_blank" rel="noreferrer">Open</a>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
