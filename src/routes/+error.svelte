<script lang="ts">
	import { page } from "$app/state";

	const status = $derived(page.status || 500);
	const message = $derived(page.error?.message || "This page could not be loaded.");
	const notFound = $derived(status === 404);
</script>

<svelte:head>
	<title>{notFound ? "Page not found" : "Something went wrong"} · Guru AI</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12">
	<div class="guru-card p-7">
		<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">{notFound ? "Error 404" : `Error ${status}`}</p>
		<h1 class="mt-2 text-2xl font-bold tracking-tight text-white">{notFound ? "That page is not here" : "The page hit a snag"}</h1>
		<p class="mt-3 text-sm leading-relaxed text-slate-400">
			{notFound
				? "The address may be mistyped, or the page may have moved. Your workspace, notes and history are untouched."
				: message}
		</p>
		{#if !notFound}
			<details class="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-500">
				<summary class="cursor-pointer select-none text-slate-400">Technical detail</summary>
				<pre class="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-400">{message}</pre>
			</details>
		{/if}
		<div class="mt-6 flex flex-wrap gap-2">
			<a href="/home" class="guru-btn guru-btn-primary">Open the workspace</a>
			<button class="guru-btn guru-btn-ghost" onclick={() => window.location.reload()}>Try again</button>
			<a href="/" class="guru-btn guru-btn-ghost">Product overview</a>
		</div>
		<p class="mt-5 border-t border-white/8 pt-4 text-[11px] text-slate-600">
			Still stuck? <a class="text-indigo-300 hover:underline" href="/settings">Check the deployment settings</a> or <a class="text-indigo-300 hover:underline" href="/inbox">message the team</a>.
		</p>
	</div>
</div>