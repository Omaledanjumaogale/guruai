<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import MarkdownLite from "$lib/components/MarkdownLite.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, mx, ax } from "$lib/convex";

	const wid = $derived($workspaceId);
	const S_agents = $derived(wid ? gq("agents.list", { workspaceId: wid }) : null);
	const agents = $derived(S_agents ? $S_agents : null);
	const S_runs = $derived(wid ? gq("agents.allRuns", { workspaceId: wid, limit: 12 }) : null);
	const runs = $derived(S_runs ? $S_runs : null);

	const STEP_TYPES = [
		{ type: "prompt", label: "AI prompt" },
		{ type: "humanize", label: "Humanize text" },
		{ type: "keywords", label: "Keyword research" },
		{ type: "visual", label: "Build a visual" },
		{ type: "note", label: "Save a note" },
		{ type: "http", label: "HTTP request" }
	];

	let builderOpen = $state(false);
	let name = $state("");
	let description = $state("");
	let steps = $state<{ id: string; type: string; name: string; config: any }[]>([]);
	let running = $state("");
	let activeRun = $state<any>(null);
	let input = $state("");

	function addStep() {
		steps.push({ id: `s${Date.now()}`, type: "prompt", name: `Step ${steps.length + 1}`, config: { prompt: "{input}" } });
	}

	async function save() {
		if (!name.trim() || steps.length === 0) return toastOk("Give the agent a name and at least one step");
		await mx("agents.create", { workspaceId: wid, name, description, steps });
		builderOpen = false;
		name = "";
		steps = [];
		toastOk("Agent saved");
	}

	async function run(agent: any) {
		running = agent._id;
		try {
			const res = await ax("agentsRun.runAgent", { agentId: agent._id, workspaceId: wid, input: input || undefined });
			activeRun = res.runId;
			toastOk(res.ok ? "Agent run complete" : "Agent run finished with errors");
		} catch (e) {
			toastErr(e);
		} finally {
			running = "";
		}
	}

	async function remove(id: string) {
		await mx("agents.remove", { id });
	}
</script>

<PageHeader title="Agents" blurb="Chain AI steps into repeatable workflows — research → write → humanize → save. Harmonized from Lindy's agent workspace.">
	<button class="guru-btn guru-btn-primary" onclick={() => (builderOpen = true)}>＋ New agent</button>
</PageHeader>

<div class="grid gap-4 lg:grid-cols-2">
	<section class="space-y-3">
		{#if !agents?.length}
			<div class="guru-card p-8 text-center text-sm text-slate-500">No agents yet. Create one — an agent is just an ordered list of steps.</div>
		{/if}
		{#each agents ?? [] as a (a._id)}
			<div class="guru-card p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h3 class="text-sm font-semibold text-white">{a.name}</h3>
						<p class="text-xs text-slate-500">{a.description}</p>
					</div>
					<div class="flex items-center gap-1.5">
						<button class="text-sm text-slate-400 hover:text-rose-300" onclick={() => remove(a._id)} title="Delete">🗑</button>
						<button class="guru-btn guru-btn-primary !px-3 !py-1.5 text-xs" disabled={running === a._id} onclick={() => run(a)}>
							{#if running === a._id}<span class="guru-spin h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"></span>{:else}▶ Run{/if}
						</button>
					</div>
				</div>
				<div class="mt-3 flex flex-wrap gap-1.5">
					{#each a.steps as s (s.id)}
						<span class="rounded-full bg-ink-850/80 px-2.5 py-1 text-[11px] text-slate-300">
							{STEP_TYPES.find((t) => t.type === s.type)?.label ?? s.type} · {s.name}
						</span>
					{/each}
				</div>
				{#if runs?.filter((r) => r.agentId === a._id).length}
					<ul class="mt-3 space-y-1 border-t border-indigo-500/10 pt-2">
						{#each runs.filter((r) => r.agentId === a._id).slice(0, 3) as r (r._id)}
							<li class="flex items-center justify-between text-[11px] text-slate-500">
								<span>{new Date(r.startedAt).toLocaleString()} · {r.log.length} steps</span>
								<StatusDot status={r.status} />
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</section>

	<aside class="guru-card h-fit p-4">
		<h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent run logs</h2>
		{#if !runs?.length}
			<p class="py-6 text-center text-sm text-slate-500">Run an agent to see its step-by-step log here.</p>
		{:else}
			{#each runs.slice(0, 6) as r (r._id)}
				<details class="mb-2 rounded-lg bg-ink-850/60 p-3">
					<summary class="flex cursor-pointer items-center justify-between text-xs text-slate-300">
						<span>{new Date(r.startedAt).toLocaleString()}</span>
						<StatusDot status={r.status} />
					</summary>
					<ul class="mt-2 space-y-1.5">
						{#each r.log as entry (entry.stepId + entry.at)}
							<li class="text-[12px] leading-relaxed">
								<span class={entry.status === "ok" ? "text-emerald-400" : "text-rose-400"}>{entry.status === "ok" ? "✔" : "✖"}</span>
								<strong class="text-slate-300">{entry.stepName}</strong>
								{#if entry.output}
									<p class="mt-0.5 line-clamp-3 text-slate-500">{entry.output}</p>
								{/if}
								{#if entry.error}
									<p class="mt-0.5 text-rose-300">{entry.error}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</details>
			{/each}
		{/if}
		{#if activeRun}
			<p class="text-[11px] text-indigo-300">Latest run {activeRun.slice(-6)} — status updates live.</p>
		{/if}
	</aside>
</div>

<Modal bind:open={builderOpen} title="Build an agent" wide>
	<div class="space-y-4">
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="guru-label" for="aname">Agent name</label>
				<input id="aname" class="guru-input" bind:value={name} placeholder="e.g. Weekly content pipeline" />
			</div>
			<div>
				<label class="guru-label" for="adesc">Description</label>
				<input id="adesc" class="guru-input" bind:value={description} placeholder="What does this agent do?" />
			</div>
		</div>

		<div>
			<div class="flex items-center justify-between">
				<p class="guru-label">Steps (run top to bottom)</p>
				<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={addStep}>＋ Add step</button>
			</div>
			{#if steps.length === 0}
				<p class="rounded-lg bg-ink-850/60 p-4 text-center text-xs text-slate-500">No steps yet. Each step receives the previous step's output (“&#123;input&#125;”).</p>
			{/if}
			{#each steps as s, i (s.id)}
				<div class="mb-2 rounded-lg border border-indigo-500/15 bg-ink-850/60 p-3">
					<div class="flex items-center gap-2">
						<span class="text-xs text-slate-500">{i + 1}.</span>
						<input class="guru-input !w-36 !py-1 text-xs" bind:value={s.name} />
						<select class="guru-input !w-44 !py-1 text-xs" bind:value={s.type}>
							{#each STEP_TYPES as t (t.type)}
								<option value={t.type}>{t.label}</option>
							{/each}
						</select>
						<button class="ml-auto text-slate-500 hover:text-rose-300" onclick={() => (steps = steps.filter((x) => x.id !== s.id))}>×</button>
					</div>
					{#if s.type === "prompt"}
						<textarea class="guru-input mt-2 min-h-[60px] text-xs" bind:value={s.config.prompt} placeholder="Prompt with {input} placeholder…"></textarea>
					{:else if s.type === "http"}
						<input class="guru-input mt-2 text-xs" bind:value={s.config.url} placeholder="https://api.example.com/…" />
					{:else if s.type === "keywords"}
						<input class="guru-input mt-2 text-xs" bind:value={s.config.seed} placeholder="Seed (blank = use input)" />
					{/if}
				</div>
			{/each}
		</div>

		<div>
			<label class="guru-label" for="ainput">Test input (optional)</label>
			<input id="ainput" class="guru-input" bind:value={input} placeholder="Starting text for the first step" />
		</div>

		<button class="guru-btn guru-btn-primary w-full" onclick={save}>Save agent</button>
	</div>
</Modal>
