<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { workspaceId, toastOk } from "$lib/stores";
	import { gq, mx } from "$lib/convex";
	import { TASK_TYPES, DEFAULT_MODELS, route, detectTask } from "$lib/routing";

	const wid = $derived($workspaceId);
	const S_rules = $derived(wid ? gq("settings.readSetting", { workspaceId: wid, key: "routing.rules" }) : null);
	const rules = $derived(S_rules ? ($S_rules ?? []) : []);
	const S_connectors = $derived(wid ? gq("connectors.list", { workspaceId: wid }) : null);
	const connectors = $derived(S_connectors ? $S_connectors : null);

	let test = $state("");
	const preview = $derived.by(() => {
		if (!test.trim()) return null;
		return route(detectTask(test), (connectors ?? []).map((c: any) => ({ provider: c.provider })), rules ?? []);
	});

	async function setRule(task: string, provider: string, model: string) {
		const next = [...(rules as any[] ?? []).filter((r) => r.task !== task), { task, provider, model }];
		await mx("settingsMutations.setSetting", { workspaceId: wid, key: "routing.rules", value: next });
		toastOk(`Rule saved: ${task} → ${provider}`);
	}

	async function clearRules() {
		await mx("settingsMutations.setSetting", { workspaceId: wid, key: "routing.rules", value: [] });
		toastOk("All rules cleared — auto-fit routing is active");
	}
</script>

<PageHeader title="GuruRoute" blurb="The routing engine, harmonized from Not Diamond: every task is sent to the strongest model you actually have connected.">
	<button class="guru-btn guru-btn-ghost" onclick={clearRules}>Reset to auto-fit</button>
</PageHeader>

<div class="grid gap-4 lg:grid-cols-2">
	<section class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Routing rules</h2>
		<div class="space-y-3">
			{#each TASK_TYPES as t (t.id)}
				{@const rule = (rules as any[]).find((r) => r.task === t.id)}
				<div class="flex flex-wrap items-center gap-2 rounded-lg bg-ink-850/60 p-2.5">
					<span class="min-w-40 text-sm text-slate-200">{t.label}</span>
					<span class="text-[10px] uppercase text-slate-500">{rule ? "rule" : "auto"}</span>
					<select
						class="guru-input !w-auto !py-1 text-xs"
						value={rule ? `${rule.provider}|${rule.model}` : ""}
						onchange={(e) => {
							const [p, m] = e.currentTarget.value.split("|");
							if (p) setRule(t.id, p, m);
							else mx("settingsMutations.setSetting", { workspaceId: wid, key: "routing.rules", value: (rules as any[]).filter((r) => r.task !== t.id) });
						}}
					>
						<option value="">Auto-fit (recommended)</option>
						{#each Object.keys(DEFAULT_MODELS) as p (p)}
							{#each DEFAULT_MODELS[p] as m (m.model)}
								<option value="{p}|{m.model}">{p} — {m.label}</option>
							{/each}
						{/each}
					</select>
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-4">
		<div class="guru-card p-5">
			<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Live routing preview</h2>
			<input class="guru-input" bind:value={test} placeholder="Type a task — e.g. “refactor this function” or “draft a blog post”" />
			{#if preview}
				<div class="mt-3 rounded-lg bg-ink-950/60 p-3">
					<p class="text-sm text-slate-200">→ <strong class="text-indigo-300">{preview.provider}:{preview.model}</strong></p>
					<p class="mt-1 text-xs text-slate-500">{preview.reason}</p>
					{#if preview.ranked.length > 1}
						<p class="mt-2 text-[10px] uppercase tracking-wider text-slate-600">Fallback chain</p>
						<p class="text-[11px] text-slate-400">{preview.ranked.slice(1).map((r) => r.provider).join(" → ") || "none"}</p>
					{/if}
				</div>
			{/if}
		</div>

		<div class="guru-card p-5">
			<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Connected providers</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each connectors ?? [] as c (c._id)}
					<span class="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{c.provider}</span>
				{:else}
					<p class="text-xs text-slate-500">No connectors — routing falls back to defaults until you add keys.</p>
				{/each}
			</div>
		</div>
	</section>
</div>
