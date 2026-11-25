<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import CopyButton from "$lib/components/CopyButton.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, ax, mx } from "$lib/convex";

	const wid = $derived($workspaceId);
	const S_sessions = $derived(wid ? gq("har.listSessions", { workspaceId: wid }) : null);
	const sessions = $derived(S_sessions ? $S_sessions : null);
	const S_candidates = $derived(wid ? gq("extractor.listCandidates", { workspaceId: wid }) : null);
	const candidates = $derived(S_candidates ? $S_candidates : null);

	let tab = $state<"har" | "keys">("har");
	let activeSession = $state<any>(null);
	const S_clients = $derived(activeSession ? gq("har.listClients", { sessionId: activeSession._id }) : null);
	const clients = $derived(S_clients ? $S_clients : null);

	// HAR import
	let harBusy = $state(false);
	let importName = $state("");

	async function onHarFile(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		harBusy = true;
		try {
			const har = await file.text();
			importName = importName || file.name.replace(/\.har$/i, "");
			const res = await ax<any>("har.ingestHar", { workspaceId: wid, name: importName, har });
			toastOk(`Captured ${res.endpointCount} endpoints from ${res.hosts.length} host(s)`);
		} catch (e) {
			toastErr(e);
		} finally {
			harBusy = false;
		}
	}

	// codegen
	const LANGS = ["python", "typescript", "javascript", "go", "curl", "powershell"];
	let language = $state("python");
	let generating = $state(false);

	async function gen() {
		if (!activeSession) return;
		generating = true;
		try {
			await ax("codegen.generateClient", { sessionId: activeSession._id, workspaceId: wid, language });
			toastOk(`Client generated in ${language}`);
		} catch (e) {
			toastErr(e);
		} finally {
			generating = false;
		}
	}

	// key extractor
	let source = $state("");
	let scanning = $state(false);
	let scanMeta = $state("");

	async function scan() {
		if (!source.trim() || scanning) return;
		scanning = true;
		scanMeta = "";
		try {
			const res = await ax<any>("extractor.scanRepo", { workspaceId: wid, source });
			scanMeta = `Scanned ${res.scannedFiles} file(s) — ${res.candidates.length} candidate(s) found.`;
			if (res.candidates.length === 0) toastOk("No keys found — nothing to vault.");
			else toastOk(`${res.candidates.length} key candidate(s) ready for review`);
		} catch (e) {
			toastErr(e);
		} finally {
			scanning = false;
		}
	}

	async function approve(c: any) {
		try {
			await mx("extractor.approveCandidate", { candidateId: c._id });
			toastOk(`Approved — ${c.provider} added to the Connector Vault`);
		} catch (e) {
			toastErr(e);
		}
	}

	async function reject(c: any) {
		await mx("extractor.rejectCandidate", { candidateId: c._id });
	}
</script>

<PageHeader title="Reverse API Lab" blurb="Harmonized from reverse-api-engineer: turn a website's network traffic into typed API clients, and discover connector keys inside your own repos.">
	{#snippet children()}
		<div class="flex rounded-lg border border-indigo-500/20 p-0.5 text-xs">
			<button class="rounded-md px-3 py-1.5 {tab === 'har' ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400'}" onclick={() => (tab = "har")}>HAR → Client</button>
			<button class="rounded-md px-3 py-1.5 {tab === 'keys' ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400'}" onclick={() => (tab = "keys")}>Key Extractor</button>
		</div>
	{/snippet}
</PageHeader>

{#if tab === "har"}
	<div class="grid gap-4 lg:grid-cols-[300px_1fr]">
		<aside class="space-y-3">
			<label class="guru-card flex cursor-pointer flex-col items-center gap-2 px-4 py-6 text-center text-sm text-slate-400 transition hover:border-indigo-400/50">
				<input type="file" accept=".har,application/json" class="hidden" onchange={(e) => onHarFile((e.target as HTMLInputElement).files)} />
				<span class="text-2xl">⟲</span>
				{#if harBusy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-400"></span>{:else}
					<strong class="text-slate-200">Import a HAR capture</strong>
					<span class="text-[11px] leading-snug">DevTools → Network → right-click → “Save all as HAR”. RAE-style capture, no install needed.</span>
				{/if}
			</label>
			<input class="guru-input text-xs" placeholder="Capture name (used in the generated client)" bind:value={importName} />

			<div class="guru-card max-h-[45vh] overflow-y-auto p-3">
				<h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Captures</h2>
				{#if sessions?.length}
					{#each sessions as s (s._id)}
						<button class="mb-1 w-full rounded-lg px-3 py-2 text-left transition {activeSession?._id === s._id ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-300 hover:bg-white/5'}" onclick={() => (activeSession = s)}>
							<p class="text-sm">{s.name}</p>
							<p class="text-[10px] text-slate-500">{s.endpointCount} endpoints · {s.entryCount} requests · {new Date(s.createdAt).toLocaleDateString()}</p>
						</button>
					{/each}
				{:else}
					<p class="px-1 py-2 text-xs text-slate-500">No captures yet.</p>
				{/if}
			</div>
		</aside>

		<section class="guru-card p-0">
			{#if activeSession}
				<div class="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/10 px-4 py-3">
					<div>
						<h2 class="text-sm font-semibold text-white">{activeSession.name}</h2>
						<p class="text-[11px] text-slate-500">target: {activeSession.targetUrl}</p>
					</div>
					<div class="flex items-center gap-2">
						<select class="guru-input !w-36 !py-1 text-xs" bind:value={language}>
							{#each LANGS as l (l)}
								<option value={l}>{l}</option>
							{/each}
						</select>
						<button class="guru-btn guru-btn-primary !px-3 !py-1.5 text-xs" disabled={generating} onclick={gen}>
							{#if generating}<span class="guru-spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"></span>{:else}Generate client{/if}
						</button>
					</div>
				</div>

				<!-- endpoints -->
				<details class="border-b border-indigo-500/10 px-4 py-3" open>
					<summary class="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">Endpoints ({(activeSession.endpoints ?? []).length})</summary>
					<div class="mt-2 max-h-56 overflow-y-auto">
						<table class="w-full text-left text-[12px]">
							<thead class="text-slate-500"><tr><th class="py-1 pr-2">Method</th><th class="py-1">Path</th><th class="py-1 text-right">Samples</th></tr></thead>
							<tbody>
								{#each activeSession.endpoints as ep (ep.id)}
									<tr class="border-t border-indigo-500/5">
										<td class="py-1 pr-2"><span class="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">{ep.method}</span></td>
										<td class="py-1 font-mono text-slate-300">{ep.path}</td>
										<td class="py-1 text-right text-slate-500">{ep.count}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>

				<!-- generated clients -->
				<div class="p-4">
					<h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Generated clients</h3>
					{#if !clients?.length}
						<p class="text-xs text-slate-500">Pick a language above and generate a client.</p>
					{:else}
						{#each clients as cl (cl._id)}
							<details class="mb-2 rounded-lg border border-indigo-500/15">
								<summary class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs text-slate-300">
									<span class="font-mono">{cl.language} · {cl.generatedBy}</span>
									<CopyButton text={cl.code} />
								</summary>
								<pre class="max-h-72 overflow-auto bg-ink-950/70 p-3 font-mono text-[11.5px] leading-relaxed text-cyan-100">{cl.code}</pre>
							</details>
						{/each}
					{/if}
				</div>
			{:else}
				<div class="flex h-72 flex-col items-center justify-center gap-2 text-center">
					<span class="text-3xl text-indigo-300">⟲</span>
					<p class="text-sm font-semibold text-slate-300">Capture → normalize → generate</p>
					<p class="max-w-sm text-xs leading-relaxed text-slate-500">Browse a site with DevTools recording, export the HAR, and Guru AI writes a typed API client for the endpoints it actually uses.</p>
				</div>
			{/if}
		</section>
	</div>
{:else}
	<div class="space-y-4">
		<div class="guru-card p-5">
			<h2 class="mb-1 text-sm font-semibold text-white">Extract connector keys from your own repos</h2>
			<p class="mb-3 text-xs leading-relaxed text-slate-500">
				Paste a public <code class="rounded bg-ink-800 px-1">github.com/owner/repo</code> URL (config/env files are scanned) or paste source files directly. Found keys become reviewable candidates — you approve what enters the vault, and values are always masked.
			</p>
			<textarea class="guru-input min-h-[110px] font-mono text-[12.5px]" bind:value={source} placeholder={"github.com/my-org/my-repo\n— or —\nDEEPAI_API_KEY=xxxxxxxx\nOPENAI_API_KEY=sk-…"}></textarea>
			<div class="mt-3 flex items-center gap-3">
				<button class="guru-btn guru-btn-primary" disabled={scanning || !source.trim()} onclick={scan}>
					{#if scanning}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Scanning…{:else}Scan for keys & endpoints{/if}
				</button>
				{#if scanMeta}<span class="text-xs text-slate-400">{scanMeta}</span>{/if}
			</div>
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			{#each (candidates ?? []).filter((c) => c.status === "pending") as c (c._id)}
				<div class="guru-card p-4">
					<div class="flex items-start justify-between gap-2">
						<div>
							<h3 class="text-sm font-semibold text-white">{c.provider} <span class="text-xs font-normal text-slate-500">({c.keyEnvName})</span></h3>
							<p class="mt-1 rounded bg-ink-950/60 p-2 font-mono text-[11px] text-slate-400">{c.snippet}</p>
							{#if c.baseUrl}<p class="mt-1 text-[10px] text-slate-600">base: {c.baseUrl}</p>{/if}
						</div>
						<span class="shrink-0 text-[10px] text-amber-300">{Math.round(c.confidence * 100)}% match</span>
					</div>
					<div class="mt-3 flex gap-2">
						<button class="guru-btn guru-btn-primary !px-3 !py-1.5 text-xs" onclick={() => approve(c)}>✔ Approve into vault</button>
						<button class="guru-btn guru-btn-danger !px-3 !py-1.5 text-xs" onclick={() => reject(c)}>Reject</button>
					</div>
				</div>
			{:else}
				<p class="guru-card p-6 text-center text-sm text-slate-500">No pending candidates. Approved keys appear in the <a class="text-indigo-300 hover:underline" href="/connectors">Connector Vault</a>.</p>
			{/each}
		</div>

		{#if (candidates ?? []).some((c) => c.status !== "pending")}
			<details class="guru-card p-4">
				<summary class="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">Reviewed candidates</summary>
				<ul class="mt-2 space-y-1 text-xs">
					{#each (candidates ?? []).filter((c) => c.status !== "pending") as c (c._id)}
						<li class="flex items-center justify-between text-slate-400"><span>{c.provider} · {c.keyEnvName} · {c.sourceLabel}</span><StatusDot status={c.status} /></li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>
{/if}
