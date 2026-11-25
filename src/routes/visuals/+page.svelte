<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import VisualDiagram from "$lib/components/VisualDiagram.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { ax } from "$lib/convex";

	const wid = $derived($workspaceId);
	let text = $state("");
	let spec = $state<any>(null);
	let busy = $state(false);

	async function generate() {
		if (!text.trim() || busy) return;
		busy = true;
		try {
			spec = await ax("visuals.generateVisual", { workspaceId: wid, text });
			toastOk("Visual ready");
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}

	async function download() {
		const svg = document.querySelector(".visual-host svg");
		if (!svg) return;
		const xml = new XMLSerializer().serializeToString(svg);
		const blob = new Blob([`<?xml version="1.0"?>\n${xml}`], { type: "image/svg+xml" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "guru-visual.svg";
		a.click();
		URL.revokeObjectURL(a.href);
		toastOk("Downloaded as SVG");
	}
</script>

<PageHeader title="Visuals" blurb="Paste notes, a plan or a process — Guru turns them into clean diagrams you can export. Harmonized from Napkin AI's text-to-visual idea." />

<div class="grid gap-4 lg:grid-cols-[380px_1fr]">
	<div class="guru-card h-fit p-5">
		<label class="guru-label" for="text">Your text</label>
		<textarea id="text" class="guru-input min-h-[180px]" placeholder={"1. Capture traffic with a HAR export\n2. Normalize endpoints\n3. Generate a typed client\n4. Extract and vault keys"} bind:value={text}></textarea>
		<button class="guru-btn guru-btn-primary mt-4 w-full" disabled={busy || !text.trim()} onclick={generate}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Composing…{:else}Make it visual{/if}
		</button>
		<p class="mt-3 text-[11px] leading-relaxed text-slate-500">With a chat connector connected, an AI model structures the diagram. Without one, a built-in deterministic engine lays out your steps — so this module always works.</p>
	</div>

	<div class="visual-host space-y-3">
		{#if spec}
			<VisualDiagram {spec} />
			<div class="flex gap-2">
				<button class="guru-btn guru-btn-ghost" onclick={download}>⬇ Download SVG</button>
				<button class="guru-btn guru-btn-ghost" onclick={generate}>↻ Regenerate</button>
			</div>
		{:else}
			<div class="guru-card flex h-72 items-center justify-center text-sm text-slate-500">Your diagram will render here.</div>
		{/if}
	</div>
</div>
