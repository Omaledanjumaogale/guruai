<script lang="ts">
	import { onMount } from "svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import CopyButton from "$lib/components/CopyButton.svelte";
	import { workspaceId, workspaceName, toastOk } from "$lib/stores";
	import { gq, mx } from "$lib/convex";
	import { session, account } from "$lib/auth";
	import { installPrompt, installed, updateReady, promptInstall, applyUpdate } from "$lib/pwa";
	import { can, type Me } from "$lib/access";

	const wid = $derived($workspaceId);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	let name = $state("");
	let buildInfo = $state<any>(null);
	let nameDirty = $state(false);

	$effect(() => {
		if (!nameDirty) name = $workspaceName;
	});

	onMount(async () => {
		try {
			const res = await fetch("/build-info.json", { cache: "no-store" });
			if (res.ok) buildInfo = await res.json();
		} catch {
			/* offline */
		}
	});

	async function saveName() {
		if (!name.trim()) return;
		localStorage.setItem("guru.workspace.name", name.trim());
		workspaceName.set(name.trim());
		nameDirty = false;
		try {
			await mx("settingsMutations.setSetting", { workspaceId: wid, key: "workspace.name", value: name.trim() });
			toastOk("Workspace name saved");
		} catch {
			toastOk("Saved on this device — the backend is offline.");
		}
	}

	async function exportData() {
		toastOk("Data export runs against your Convex dashboard: npx convex export");
	}

	function resetShell() {
		if (!confirm("Clear the cached app shell and reload? Your data is not affected.")) return;
		navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).finally(() => location.reload());
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
		"Launch from the home screen — Guru AI runs full-screen with an offline shell."
	];
</script>

<PageHeader title="Settings" blurb="Your account, this workspace, the installed app and the deployment behind it." />

<div class="grid gap-4 lg:grid-cols-2">
	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Account</h2>
		{#if $session}
			<p class="text-sm font-semibold text-white">{me?.profile?.displayName ?? me?.account.name ?? $account?.email}</p>
			<p class="text-xs text-slate-500">{$account?.email} · {me?.roleKeys.join(" · ") || "member"}</p>
			<p class="mt-1 text-[11px] text-slate-500">Plan: <span class="text-indigo-300">{me?.plan?.name ?? "Starter"}</span></p>
			<div class="mt-4 flex flex-wrap gap-2">
				<a href="/profile" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Edit profile</a>
				<a href="/roles" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Roles</a>
				<a href="/subscription" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Plan</a>
				<a href="/notifications" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Notifications</a>
				{#if can(me, "messages.create")}<a href="/inbox" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Messages</a>{/if}
				{#if can(me, "admin.users.read")}<a href="/admin" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Admin</a>{/if}
			</div>
		{:else}
			<p class="text-sm text-slate-400">Sign in to manage your profile, plan and notification preferences.</p>
			<a href="/login" class="guru-btn guru-btn-primary mt-3">Sign in</a>
		{/if}
	</div>

	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Workspace</h2>
		<label class="guru-label" for="wname">Workspace name</label>
		<div class="flex gap-2">
			<input id="wname" class="guru-input" bind:value={name} oninput={() => (nameDirty = true)} placeholder="My Workspace" />
			<button class="guru-btn guru-btn-primary" onclick={saveName}>Save</button>
		</div>
		<p class="mt-3 text-xs leading-relaxed text-slate-500">Workspace id: <code class="rounded bg-ink-800 px-1 font-mono text-[10px]">{$workspaceId || "not initialized"}</code>. This key scopes every note, chat, capture and connector to this device profile.</p>
	</div>

	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Install the app</h2>
		{#if $installed}
			<p class="text-sm text-emerald-300">Installed — you are running the standalone app.</p>
			<p class="mt-1 text-xs text-slate-500">Offline shell enabled. Updates apply on the next reload.</p>
			{#if $updateReady}<button class="guru-btn guru-btn-primary mt-3" onclick={applyUpdate}>Apply update</button>{/if}
		{:else if $installPrompt}
			<p class="text-sm text-slate-300">Install Guru AI for a full-screen, offline-capable workspace.</p>
			<button class="guru-btn guru-btn-primary mt-3" onclick={promptInstall}>Install app</button>
		{:else}
			<p class="text-sm text-slate-300">Installing is available from a browser menu.</p>
			<ol class="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-400">
				{#each mobileSteps as step (step)}<li>{step}</li>{/each}
			</ol>
		{/if}
	</div>

	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Build & deployment</h2>
		{#if buildInfo}
			<dl class="space-y-1.5 text-xs">
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Version</dt><dd class="text-slate-200">{buildInfo.version}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Commit</dt><dd class="truncate font-mono text-[10px] text-slate-300">{buildInfo.commitSha?.slice(0, 12) || "unknown"}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Branch</dt><dd class="text-slate-300">{buildInfo.branch}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Environment</dt><dd class="text-slate-300">{buildInfo.environment}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-slate-500">Built</dt><dd class="text-slate-300">{new Date(buildInfo.builtAt).toLocaleString()}</dd></div>
			</dl>
		{:else}
			<p class="text-xs text-slate-500">Build metadata is unavailable in this shell.</p>
		{/if}
		<div class="mt-3 flex flex-wrap gap-2">
			<a class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs" href="/build-info.json" target="_blank" rel="noreferrer">Open build-info.json</a>
			<button class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs" onclick={resetShell}>Reset app shell</button>
			<button class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs" onclick={exportData}>Export workspace data</button>
		</div>
	</div>

	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Install & deploy yourself</h2>
		<div class="grid gap-3 md:grid-cols-2">
			{#each installSteps as step (step.label)}
				<div class="rounded-lg border border-indigo-500/15 bg-ink-950/60 p-3">
					<div class="mb-2 flex items-center justify-between"><p class="text-xs font-semibold text-slate-300">{step.label}</p><CopyButton text={step.code} /></div>
					<pre class="overflow-x-auto font-mono text-[11.5px] leading-relaxed text-cyan-100">{step.code}</pre>
				</div>
			{/each}
		</div>
	</div>

	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">About</h2>
		<p class="max-w-3xl text-sm leading-relaxed text-slate-400">
			<strong class="text-slate-200">Guru AI {buildInfo?.version ?? "v1.0"}</strong> — one harmonized workspace built from the strengths of DeepAI (chat, image/video/music engines), WriteHuman &amp; Humbot (humanizer), Not Diamond (model routing), Napkin (text→visuals), AnswerThePublic (keyword intelligence), FreeConvert (conversion toolbox), Monica (assistant flows), youtubetotranscript (captions), Google Keep (notes), Lindy (agent workflows) and Reverse API Engineer (HAR→API clients + key extraction). Runs as a desktop web app, an installable PWA on mobile, on Cloudflare Pages with a Convex backend.
		</p>
	</div>
</div>