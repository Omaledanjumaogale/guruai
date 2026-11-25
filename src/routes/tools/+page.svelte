<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { ax } from "$lib/convex";

	const wid = $derived($workspaceId);

	/** Harmonized from deepai.org/apis and its machine-learning-model pages. */
	const MODELS = [
		{ id: "summarizer", name: "Summarizer", blurb: "Condense any text into crisp bullet points", icon: "≡", kind: "llm", system: "Summarize the text into a short abstract plus 5 bullet takeaways. Markdown only." },
		{ id: "sentiment", name: "Sentiment Analysis", blurb: "Classify tone and emotion with a score", icon: "◑", kind: "llm", system: "Analyze sentiment. Return JSON: {label:'positive|negative|neutral|mixed', score:0..1, reasoning:string}." },
		{ id: "translator", name: "Translator", blurb: "Translate into 40+ languages", icon: "⇄", kind: "llm", system: "Translate the text faithfully. First line: the language you translated to. Then the translation." },
		{ id: "rewriter", name: "Content Improver", blurb: "Sharpen clarity, flow and punch", icon: "✎", kind: "llm", system: "Improve the writing: clarity, concision, flow. Keep facts identical. Output only the improved text." },
		{ id: "outline", name: "Outline Generator", blurb: "Structure any topic into an article plan", icon: "▤", kind: "llm", system: "Produce a structured article outline (H2/H3 bullets) for the topic." },
		{ id: "codeexplain", name: "Code Explainer", blurb: "Explain what a snippet does, line by line", icon: "⌘", kind: "llm", system: "Explain the code plainly: what it does, inputs/outputs, edge cases, and one improvement." },
		{ id: "email", name: "Email Writer", blurb: "Draft professional emails from a brief", icon: "✉", kind: "llm", system: "Write a professional email from the brief. Subject line first, then body." },
		{ id: "hashtags", name: "Hashtag Generator", blurb: "Social-ready tags from any topic", icon: "#", kind: "llm", system: "Return exactly 20 relevant hashtags, one per line, no commentary." }
	];

	let active = $state(MODELS[0]);
	let text = $state("");
	let output = $state("");
	let busy = $state(false);

	async function run() {
		if (!text.trim() || busy) return;
		busy = true;
		try {
			output = await ax("ai.complete", { workspaceId: wid, system: active.system, prompt: text });
			toastOk(`${active.name} done`);
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader title="AI Toolbox" blurb="The model grid from deepai.org/apis, harmonized into your workspace — every tool runs through GuruRoute's connected engines." />

<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
	{#each MODELS as m (m.id)}
		<button class="guru-card flex items-start gap-2.5 p-3.5 text-left transition hover:border-indigo-400/40 {active.id === m.id ? 'border-indigo-400/50' : ''}" onclick={() => {active = m; output = '';}}>
			<span class="text-lg text-indigo-300">{m.icon}</span>
			<div>
				<p class="text-sm font-semibold text-slate-100">{m.name}</p>
				<p class="text-[11px] leading-snug text-slate-500">{m.blurb}</p>
			</div>
		</button>
	{/each}
</div>

<div class="grid gap-4 lg:grid-cols-2">
	<div class="guru-card p-5">
		<label class="guru-label" for="tin">Input for {active.name}</label>
		<textarea id="tin" class="guru-input min-h-[220px]" bind:value={text} placeholder="Paste or type the text for this tool…"></textarea>
		<button class="guru-btn guru-btn-primary mt-4 w-full" disabled={busy || !text.trim()} onclick={run}>
			{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Running…{:else}Run {active.name}{/if}
		</button>
	</div>
	<div class="guru-card p-5">
		<label class="guru-label">Result</label>
		{#if output}
			<div class="min-h-[220px] whitespace-pre-wrap rounded-lg bg-ink-950/60 p-3 text-[14px] leading-relaxed text-slate-200">{output}</div>
		{:else}
			<div class="flex min-h-[220px] items-center justify-center rounded-lg bg-ink-950/60 text-sm text-slate-500">Output appears here.</div>
		{/if}
	</div>
</div>
