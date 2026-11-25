<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { gq, ax } from "$lib/convex";

	const wid = $derived($workspaceId);
	const S_connectors = $derived(wid ? gq("connectors.list", { workspaceId: wid }) : null);
	const connectors = $derived(S_connectors ? $S_connectors : null);

	const PROVIDERS = [
		{ id: "deepai", label: "DeepAI", blurb: "Chat · text2img · text2video · music", needsBase: false, models: ["default"] },
		{ id: "openai", label: "OpenAI", blurb: "GPT models via api.openai.com", needsBase: false, models: ["gpt-4o-mini", "gpt-4o", "o4-mini"] },
		{ id: "anthropic", label: "Anthropic", blurb: "Claude models", needsBase: false, models: ["claude-haiku-4-5", "claude-sonnet-4-6"] },
		{ id: "gemini", label: "Google Gemini", blurb: "Gemini models", needsBase: false, models: ["gemini-2.0-flash", "gemini-1.5-flash"] },
		{ id: "groq", label: "Groq", blurb: "Llama models, very fast", needsBase: false, models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
		{ id: "openrouter", label: "OpenRouter", blurb: "One key, hundreds of models", needsBase: false, models: ["openrouter/auto", "openrouter/openai/gpt-4o-mini"] },
		{ id: "custom", label: "Custom (OpenAI-compatible)", blurb: "Any /v1/chat/completions endpoint", needsBase: true, models: ["default"] },
		{ id: "music", label: "Music engine", blurb: "Text-to-music endpoint (DeepAI-compatible)", needsBase: true, models: ["default"] }
	];

	let provider = $state("deepai");
	let label = $state("");
	let token = $state("");
	let baseUrl = $state("");
	let open = $state(false);

	const preset = $derived(PROVIDERS.find((p) => p.id === provider)!);

	async function add() {
		if (!token.trim()) return toastErr(new Error("Paste the API key."));
		try {
			await axConnect();
		} catch {
			/* fall through */
		}
	}

	async function axConnect() {
		const { mx } = await import("$lib/convex");
		await mx("connectors.add", {
			workspaceId: wid,
			provider,
			label: label.trim() || preset.label,
			baseUrl: baseUrl.trim() || undefined,
			token: token.trim()
		});
		open = false;
		token = "";
		label = "";
		baseUrl = "";
		toastOk("Connector added — hit Test to verify it.");
	}

	async function test(c: any) {
		try {
			const res = await ax<{ ok: boolean; message: string }>("ai.testConnector", { connectorId: c._id });
			toastOk(res.ok ? `${c.provider}: ${res.message}` : `Test failed: ${res.message}`);
		} catch (e) {
			toastErr(e);
		}
	}

	async function remove(c: any) {
		const { mx } = await import("$lib/convex");
		await mx("connectors.remove", { id: c._id });
		toastOk("Connector removed");
	}
</script>

<PageHeader title="Connector Vault" blurb="Every engine in Guru AI runs on keys you own. Keys are stored server-side, shown masked, and never returned to the browser.">
	<button class="guru-btn guru-btn-primary" onclick={() => (open = true)}>＋ Add connector</button>
</PageHeader>

{#if !connectors?.length}
	<div class="guru-card p-8 text-center">
		<p class="text-sm text-slate-400">No connectors yet.</p>
		<p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
			Add a DeepAI key to power chat, images and video — or open the
			<a class="text-indigo-300 hover:underline" href="/reverse-api">Reverse API Lab</a> to scan your own repos for existing keys and approve them into the vault.
		</p>
	</div>
{:else}
	<div class="grid gap-3 md:grid-cols-2">
		{#each connectors as c (c._id)}
			<div class="guru-card p-4">
				<div class="flex items-start justify-between">
					<div>
						<h3 class="flex items-center gap-2 text-sm font-semibold text-white">{c.provider} <StatusDot status={c.status} /></h3>
						<p class="text-xs text-slate-500">{c.label} · {c.masked}</p>
						{#if c.baseUrl}<p class="text-[10px] text-slate-600">{c.baseUrl}</p>{/if}
						{#if c.lastError}<p class="mt-1 text-[10px] text-rose-300/80">{c.lastError}</p>{/if}
					</div>
					<div class="flex gap-1">
						<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={() => test(c)}>Test</button>
						<button class="text-sm text-slate-500 hover:text-rose-300" onclick={() => remove(c)}>🗑</button>
					</div>
				</div>
				<p class="mt-2 text-[10px] uppercase tracking-wider text-slate-600">via {c.origin === "reverse-api-extractor" ? "Reverse API extractor" : "manual entry"}</p>
			</div>
		{/each}
	</div>
{/if}

<!-- add modal (inline, avoids another import) -->
{#if open}
	<div class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => (open = false)} aria-label="Close"></button>
		<div class="guru-card relative z-10 w-full max-w-lg p-5">
			<h2 class="mb-4 text-lg font-semibold text-white">Add a connector</h2>
			<div class="space-y-3">
				<div>
					<label class="guru-label" for="prov">Provider</label>
					<select id="prov" class="guru-input" bind:value={provider}>
						{#each PROVIDERS as p (p.id)}
							<option value={p.id}>{p.label} — {p.blurb}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="guru-label" for="lbl">Label</label>
					<input id="lbl" class="guru-input" bind:value={label} placeholder={preset.label} />
				</div>
				<div>
					<label class="guru-label" for="tok">API key</label>
					<input id="tok" type="password" class="guru-input font-mono" bind:value={token} placeholder="Paste your key — it is masked immediately" />
				</div>
				{#if preset.needsBase}
					<div>
						<label class="guru-label" for="base">Base URL</label>
						<input id="base" class="guru-input font-mono text-xs" bind:value={baseUrl} placeholder="https://api.example.com/v1" />
					</div>
				{/if}
				<button class="guru-btn guru-btn-primary w-full" disabled={!token.trim()} onclick={add}>Save to vault</button>
				<p class="text-[11px] leading-relaxed text-slate-500">Keys live in your Convex backend, scoped to this workspace, and are only used server-side when an engine runs.</p>
			</div>
		</div>
	</div>
{/if}
