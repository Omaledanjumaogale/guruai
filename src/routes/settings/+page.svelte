<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import CopyButton from "$lib/components/CopyButton.svelte";
	import { workspaceId, workspaceName, toastOk } from "$lib/stores";
	import { mx } from "$lib/convex";

	const wid = $derived($workspaceId);
	let name = $state("");

	async function saveName() {
		if (!name.trim()) return;
		localStorage.setItem("guru.workspace.name", name.trim());
		workspaceName.set(name.trim());
		await mx("settingsMutations.setSetting", { workspaceId: wid, key: "workspace.name", value: name.trim() });
		toastOk("Workspace name saved");
	}

	async function exportData() {
		toastOk("Data export runs against your Convex dashboard: npx convex export");
	}

	const installSteps = [
		{ label: "1 · Get the code", code: "git clone https://github.com/Omaledanjumaogale/guru-ai.git\ncd guru-ai\nnpm install" },
		{ label: "2 · Start the Convex backend", code: "npm i -g convex\nnpx convex dev   # prints your deployment URL" },
		{ label: "3 · Point the app at it", code: 'echo "VITE_CONVEX_URL=<your-url>" > .env\nnpm run dev' },
		{ label: "4 · Deploy online", code: "npx convex deploy\nnpm run build\nnpx wrangler pages deploy build   # Cloudflare Pages" }
	];

	const mobileSteps = [
		"Open your deployed Guru AI URL in Safari (iOS) or Chrome (Android).",
		"iOS: Share → “Add to Home Screen”.  Android: menu → “Add to Home screen” / “Install app”.",
		"Launch from the home screen — Guru AI runs full-screen with offline shell caching."
	];
</script>

<PageHeader title="Settings" blurb="Workspace, deployment and data controls for your Guru AI install." />

<div class="grid gap-4 lg:grid-cols-2">
	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Workspace</h2>
		<label class="guru-label" for="wname">Workspace name</label>
		<div class="flex gap-2">
			<input id="wname" class="guru-input" bind:value={name} placeholder={$workspaceName} />
			<button class="guru-btn guru-btn-primary" onclick={saveName}>Save</button>
		</div>
		<p class="mt-3 text-xs leading-relaxed text-slate-500">Workspace id: <code class="rounded bg-ink-800 px-1 font-mono text-[10px]">{$workspaceId || "not initialized"}</code>. This key scopes every note, chat, capture and connector to this device profile.</p>
	</div>

	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Install on mobile (PWA)</h2>
		<ol class="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
			{#each mobileSteps as s (s)}
				<li>{s}</li>
			{/each}
		</ol>
	</div>

	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Install & deploy</h2>
		<div class="grid gap-3 md:grid-cols-2">
			{#each installSteps as step (step.label)}
				<div class="rounded-lg border border-indigo-500/15 bg-ink-950/60 p-3">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-xs font-semibold text-slate-300">{step.label}</p>
						<CopyButton text={step.code} />
					</div>
					<pre class="overflow-x-auto font-mono text-[11.5px] leading-relaxed text-cyan-100">{step.code}</pre>
				</div>
			{/each}
		</div>
		<div class="mt-3 flex flex-wrap gap-2">
			<button class="guru-btn guru-btn-ghost" onclick={() => navigator.clipboard.writeText("npx convex dev")}>Copy backend command</button>
			<button class="guru-btn guru-btn-ghost" onclick={exportData}>Export workspace data</button>
		</div>
	</div>

	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">About</h2>
		<p class="max-w-3xl text-sm leading-relaxed text-slate-400">
			<strong class="text-slate-200">Guru AI v1.0</strong> — one harmonized workspace built from the strengths of DeepAI (chat, image/video/music engines), WriteHuman &amp; Humbot (humanizer), Not Diamond (model routing), Napkin (text→visuals), AnswerThePublic (keyword intelligence), FreeConvert (conversion toolbox), Monica (assistant flows), youtubetotranscript (captions), Google Keep (notes), Lindy (agent workflows) and Reverse API Engineer (HAR→API clients + key extraction). Runs as a desktop web app, an installable PWA on mobile, on Cloudflare Pages with a Convex backend.
		</p>
	</div>
</div>
