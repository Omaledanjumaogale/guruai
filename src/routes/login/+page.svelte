<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import {
		account,
		authError,
		describeError,
		httpSite,
		passwordLogin,
		registerAccount,
		startOAuth
	} from "$lib/auth";
	import { convexReady } from "$lib/convex";
	import { toastOk } from "$lib/stores";

	type Mode = "signin" | "signup";

	let mode = $state<Mode>("signin");
	let email = $state("");
	let password = $state("");
	let confirm = $state("");
	let name = $state("");
	let busy = $state(false);
	let error = $state("");

	const next = $derived(page.url.searchParams.get("next") ?? "/");
	const acc = $derived($account);
	const valid = $derived(
		/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
			password.length >= 8 &&
			(mode === "signin" || confirm === password)
	);

	$effect(() => {
		if (acc) goto(next, { replaceState: true });
	});

	function switchMode(m: Mode) {
		mode = m;
		error = "";
		confirm = "";
		authError.set("");
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (busy || !valid) return;
		busy = true;
		error = "";
		try {
			if (mode === "signin") {
				await passwordLogin(email, password);
				toastOk("Welcome back to Guru AI");
			} else {
				await registerAccount(email, password, name);
				toastOk("Your Guru AI account is ready");
			}
			await goto(next, { replaceState: true });
		} catch (err) {
			error = describeError(err);
			authError.set(error);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{mode === "signin" ? "Sign in" : "Create your account"} · Guru AI</title>
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-1 py-4">
	<div class="grid w-full gap-6 lg:grid-cols-2 lg:items-center">
		<!-- Brand column -->
		<section class="hidden lg:block">
			<div class="mb-4 inline-flex items-center gap-3">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl font-bold text-white">G</div>
				<div>
					<p class="text-lg font-bold tracking-wide text-white">Guru <span class="guru-gradient-text">AI</span></p>
					<p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Enterprise workspace</p>
				</div>
			</div>
			<h1 class="text-3xl font-bold leading-tight text-white">
				One account for every<br /><span class="guru-gradient-text">engine you run.</span>
			</h1>
			<p class="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
				Chat, image, video and music studios, the humanizer, keyword intelligence, converters, transcripts, notes,
				multi-step agents and the Reverse API Lab — all bound to the same workspace.
			</p>
			<ul class="mt-5 space-y-2 text-sm text-slate-400">
				<li class="flex gap-2"><span class="text-emerald-300">✓</span> Sessions are opaque tokens; keys never reach the browser.</li>
				<li class="flex gap-2"><span class="text-emerald-300">✓</span> Workspace data stays scoped to your account.</li>
				<li class="flex gap-2"><span class="text-emerald-300">✓</span> Installs as a PWA on laptop, tablet and phone.</li>
			</ul>
		</section>

		<!-- Auth card -->
		<section class="guru-card p-5 sm:p-6">
			<div class="mb-4 flex items-center gap-3 lg:hidden">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-bold text-white">G</div>
				<p class="text-sm font-bold text-white">Guru <span class="guru-gradient-text">AI</span></p>
			</div>

			<div class="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-ink-950/60 p-1">
				<button
					type="button"
					class="rounded-md px-3 py-2 text-sm font-semibold transition {mode === 'signin' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}"
					onclick={() => switchMode("signin")}>Sign in</button
				>
				<button
					type="button"
					class="rounded-md px-3 py-2 text-sm font-semibold transition {mode === 'signup' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}"
					onclick={() => switchMode("signup")}>Create account</button
				>
			</div>

			{#if !convexReady}
				<div class="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
					The backend is not connected, so accounts cannot be verified. Set <code class="rounded bg-black/30 px-1">VITE_CONVEX_URL</code> and rebuild.
				</div>
			{/if}

			<form class="space-y-3" onsubmit={submit}>
				{#if mode === "signup"}
					<div>
						<label class="guru-label" for="name">Name</label>
						<input id="name" class="guru-input" bind:value={name} placeholder="Ada Lovelace" autocomplete="name" />
					</div>
				{/if}
				<div>
					<label class="guru-label" for="email">Email</label>
					<input
						id="email"
						type="email"
						class="guru-input"
						bind:value={email}
						placeholder="you@company.com"
						autocomplete="email"
						required
					/>
				</div>
				<div>
					<label class="guru-label" for="password">Password</label>
					<input
						id="password"
						type="password"
						class="guru-input"
						bind:value={password}
						placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
						autocomplete={mode === "signup" ? "new-password" : "current-password"}
						required
					/>
				</div>
				{#if mode === "signup"}
					<div>
						<label class="guru-label" for="confirm">Confirm password</label>
						<input
							id="confirm"
							type="password"
							class="guru-input"
							bind:value={confirm}
							placeholder="Repeat your password"
							autocomplete="new-password"
							required
						/>
						{#if confirm && confirm !== password}
							<p class="mt-1 text-[11px] text-rose-300">Passwords do not match yet.</p>
						{/if}
					</div>
				{/if}

				{#if error}
					<div class="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-relaxed text-rose-200" role="alert">
						{error}
					</div>
				{/if}

				<button class="guru-btn guru-btn-primary w-full" type="submit" disabled={busy || !valid}>
					{#if busy}
						<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span>
						{mode === "signin" ? "Signing in…" : "Creating account…"}
					{:else}
						{mode === "signin" ? "Sign in" : "Create account"}
					{/if}
				</button>
			</form>

			<div class="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
				<span class="h-px flex-1 bg-indigo-500/15"></span> or <span class="h-px flex-1 bg-indigo-500/15"></span>
			</div>

			<div class="space-y-2">
				<button class="guru-btn guru-btn-ghost w-full justify-center" onclick={() => startOAuth("google")} disabled={!httpSite}>
					<span class="font-bold text-white">G</span> Continue with Google
				</button>
				<button class="guru-btn guru-btn-ghost w-full justify-center" onclick={() => startOAuth("github")} disabled={!httpSite}>
					<span class="text-white">⌂</span> Continue with GitHub
				</button>
			</div>

			<p class="mt-4 text-[11px] leading-relaxed text-slate-500">
				{mode === "signin"
					? "Use the super-admin email and password for full deployment control, or your own account for the workspace."
					: "The first account that matches the configured super-admin email is promoted to admin automatically."}
			</p>
		</section>
	</div>
</div>
