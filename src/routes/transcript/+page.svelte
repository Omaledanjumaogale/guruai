<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import BrandBanner from "$lib/components/BrandBanner.svelte";
	import MarkdownLite from "$lib/components/MarkdownLite.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, ax, mx } from "$lib/convex";

	const wid = $derived($workspaceId);
	const S_list = $derived(wid ? gq("transcripts.list", { workspaceId: wid, limit: 20 }) : null);
	const list = $derived(S_list ? $S_list : null);

	let url = $state("");
	let busy = $state(false);
	let activeId = $state("");
	const active = $derived((list ?? []).find((t: any) => t._id === activeId) ?? null);
	const segments = $derived(active?.segments ?? []);
	let search = $state("");

	async function fetchIt() {
		if (!url.trim() || busy) return;
		busy = true;
		try {
			const out = await ax<any>("transcript.fetchTranscript", { workspaceId: wid, url });
			const id = await mx("transcripts.create", {
				workspaceId: wid,
				videoId: out.videoId,
				url: out.url,
				title: out.title,
				language: out.language,
				content: out.content,
				segments: out.segments
			});
			activeId = id;
			url = "";
			toastOk("Transcript saved");
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}

	async function summarize() {
		if (!active) return;
		try {
			const s = await ax("transcript.summarizeTranscript", { workspaceId: wid, content: active.content });
			await mx("transcripts.setSummary", { id: active._id, summary: s });
			toastOk("Summary ready");
		} catch (e) {
			toastErr(e);
		}
	}

	let pasted = $state("");
	let pasteTitle = $state("");
	let pasteBusy = $state(false);

	/** Parse SRT/VTT or plain text into timestamped segments. */
	function parsePasted(text: string): { segments: { start: number; text: string }[]; content: string } {
		const blocks = text.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);
		const segments: { start: number; text: string }[] = [];
		for (const block of blocks) {
			const lines = block.split(/\r?\n/);
			const idx = lines.findIndex((l) => l.includes("-->"));
			if (idx === -1) continue;
			const stamp = lines[idx].split("-->")[0].trim().replace(",", ".");
			const parts = stamp.split(":").map(Number);
			const start = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
			const body = lines.slice(idx + 1).join(" ").replace(/<[^>]+>/g, "").trim();
			if (body) segments.push({ start, text: body });
		}
		const content = segments.length ? segments.map((s) => s.text).join(" ") : text.replace(/\r/g, "").trim();
		return { segments, content };
	}

	async function savePasted() {
		const raw = pasted.trim();
		if (!raw || pasteBusy) return;
		pasteBusy = true;
		try {
			const parsed = parsePasted(raw);
			const id = await mx("transcripts.create", {
				workspaceId: wid,
				videoId: "pasted",
				url: url.trim(),
				title: pasteTitle.trim() || `Pasted transcript — ${new Date().toLocaleDateString()}`,
				language: "en",
				content: parsed.content,
				segments: parsed.segments.length ? parsed.segments : undefined
			});
			activeId = id as unknown as string;
			pasted = "";
			pasteTitle = "";
			toastOk(parsed.segments.length ? "Transcript saved with timestamps" : "Transcript saved");
		} catch (e) {
			toastErr(e);
		} finally {
			pasteBusy = false;
		}
	}

	const filteredSegments = $derived(
		search.trim() === "" ? segments : segments.filter((s: any) => s.text.toLowerCase().includes(search.toLowerCase()))
	);
</script>

<PageHeader title="Transcripts" blurb="YouTube video → searchable transcript with timestamps and optional AI summary. Harmonized from youtubetotranscript.com." />

<BrandBanner name="transcript" />

<div class="guru-card mb-4 p-5">
	<form class="flex flex-wrap items-end gap-3" onsubmit={(e) => { e.preventDefault(); fetchIt(); }}>
		<div class="min-w-56 flex-1">
			<label class="guru-label" for="url">YouTube URL or video id</label>
			<input id="url" class="guru-input" placeholder="https://www.youtube.com/watch?v=…" bind:value={url} />
		</div>
		<button class="guru-btn guru-btn-primary" type="submit" disabled={busy || !url.trim()}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Fetching…{:else}Get transcript{/if}
		</button>
	</form>
	<p class="mt-2 text-[11px] text-slate-500">Fetches YouTube's public caption tracks. When YouTube withholds captions from a server, paste the transcript below — timestamps (.srt/.vtt) are detected automatically.</p>
</div>

<div class="guru-card mb-4 p-5">
	<details>
		<summary class="cursor-pointer text-sm font-semibold text-slate-200">Have the transcript already? Paste it</summary>
		<div class="mt-3 grid gap-3">
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class="guru-label" for="ptitle">Title (optional)</label>
					<input id="ptitle" class="guru-input" placeholder="e.g. Weekly all-hands" bind:value={pasteTitle} />
				</div>
				<div>
					<label class="guru-label" for="purl">Source URL (optional)</label>
					<input id="purl" class="guru-input" placeholder="https://www.youtube.com/watch?v=…" bind:value={url} />
				</div>
			</div>
			<div>
				<label class="guru-label" for="pbody">Transcript text or .srt / .vtt</label>
				<textarea id="pbody" class="guru-input min-h-[160px]" placeholder="Paste the transcript here…" bind:value={pasted}></textarea>
			</div>
			<div>
				<button class="guru-btn guru-btn-primary" disabled={pasteBusy || !pasted.trim()} onclick={savePasted}>
					{#if pasteBusy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Saving…{:else}Save pasted transcript{/if}
				</button>
			</div>
		</div>
	</details>
</div>

<div class="grid gap-4 lg:grid-cols-[280px_1fr]">
	<aside class="guru-card max-h-[65vh] overflow-y-auto p-3">
		<h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Saved transcripts</h2>
		{#if list?.length}
			<ul class="space-y-1">
				{#each list as t (t._id)}
					<li>
						<button class="w-full rounded-lg px-3 py-2 text-left text-sm transition {activeId === t._id ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-300 hover:bg-white/5'}" onclick={() => (activeId = t._id)}>
							<span class="line-clamp-1">{t.title}</span>
							<span class="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString()} · {t.language}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-1 py-3 text-sm text-slate-500">Nothing saved yet.</p>
		{/if}
	</aside>

	<section class="guru-card p-0">
		{#if active}
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/10 px-4 py-3">
				<h2 class="text-sm font-semibold text-white">{active.title}</h2>
				<div class="flex items-center gap-2">
					<input class="guru-input !w-44 !py-1 text-xs" placeholder="Search transcript…" bind:value={search} />
					<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={() => navigator.clipboard.writeText(active.content)}>Copy text</button>
					<button class="guru-btn guru-btn-primary !px-2.5 !py-1 text-xs" onclick={summarize}>✦ Summarize</button>
				</div>
			</div>
			{#if active.summary}
				<div class="border-b border-indigo-500/10 bg-indigo-500/5 px-4 py-3">
					<h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">Summary</h3>
					<MarkdownLite content={active.summary} />
				</div>
			{/if}
			<div class="max-h-[55vh] overflow-y-auto p-4">
				{#if filteredSegments.length}
					<ul class="space-y-2">
						{#each filteredSegments as s (s.start)}
							<li class="flex gap-3 text-[14px] leading-relaxed text-slate-300">
								<span class="shrink-0 pt-0.5 font-mono text-[11px] text-indigo-300/80">{Math.floor(s.start / 60)}:{String(Math.floor(s.start % 60)).padStart(2, "0")}</span>
								<p>{s.text}</p>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-300">{active.content}</p>
				{/if}
			</div>
		{:else}
			<div class="flex h-64 items-center justify-center text-sm text-slate-500">Select a transcript to read it here.</div>
		{/if}
	</section>
</div>