<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import Logo from "$lib/components/Logo.svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import {
		account,
		authError,
		describeError,
		ewinLogin,
		httpSite,
		passwordLogin,
		registerAccount,
		startOAuth
	} from "$lib/auth";
	import { convexReady, mx } from "$lib/convex";
	import { toastOk } from "$lib/stores";

	type Mode = "signin" | "signup";

	let mode = $state<Mode>("signin");
	let email = $state("");
	let password = $state("");
	let confirm = $state("");
	let name = $state("");
	let busy = $state(false);
	let error = $state("");
	let showPassword = $state(false);
	let hubRetry = $state(false);

	const next = $derived(page.url.searchParams.get("next") ?? "/home");
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
		hubRetry = false;
		confirm = "";
		authError.set("");
	}

	async function finish() {
		// Idempotent onboarding: policy defaults, then the member's own profile.
		try {
			await mx("rbac.bootstrap", {});
			const token = localStorage.getItem("guru.auth.token") ?? "";
			if (token) await mx("profiles.ensureMine", { token });
		} catch {
			/* the shell retries onboarding lazily */
		}
		await goto(next, { replaceState: true });
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (busy || !valid) return;
		busy = true;
		error = "";
		hubRetry = false;
		try {
			if (mode === "signin") {
				await passwordLogin(email, password);
				toastOk("Welcome back to Guru AI");
			} else {
				await registerAccount(email, password, name);
				toastOk("Your Guru AI account is ready");
			}
			await finish();
		} catch (err) {
			error = describeError(err);
			hubRetry = mode === "signin";
			authError.set(error);
		} finally {
			busy = false;
		}
	}

	async function retryWithHub() {
		if (busy || !email || !password) return;
		busy = true;
		error = "";
		try {
			await ewinLogin(email, password);
			toastOk("Verified with E-WIN Hub");
			await finish();
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
	<meta name="description" content="Sign in to Guru AI with your E-WIN identity or workspace account." />
</svelte:head>

<div class="grid min-h-screen bg-[var(--page)] lg:grid-cols-[1.02fr_0.98fr]">
	<section
		class="relative hidden overflow-hidden border-r border-white/10 bg-[#08080b] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
		style="--ink:#ffffff; --ink-soft:#e4e4e0; --muted:#9b9ca3; --line:rgba(255,255,255,0.12); --line-strong:rgba(255,255,255,0.22); --surface:#101014; --surface-2:#16161b; --accent:#ff6b75; --accent-soft:rgba(232,66,79,0.16);"
		aria-label="About Guru AI"
	>
		<div class="pointer-events-none absolute inset-0 opacity-[0.18]" style="background-image: linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse at 20% 20%, black, transparent 72%);"></div>
		<div class="pointer-events-none absolute -left-24 top-1/3 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(232,66,79,0.3),transparent_65%)] blur-2xl"></div>
		<div class="pointer-events-none absolute -bottom-24 right-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_65%)] blur-2xl"></div>

		<div class="relative">
			<a href="/" aria-label="Guru AI home"><Logo size={40} tagline="Enterprise AI" /></a>
		</div>

		<div class="relative max-w-lg">
			<p class="guru-chip guru-chip-accent">E-WIN ecosystem · Central identity</p>
			<h1 class="mt-6 font-display text-[52px] leading-[0.98] tracking-[-0.02em] xl:text-[62px]">
				One identity.<br /><span class="italic text-[#ff7a80]">Every engine.</span>
			</h1>
			<p class="mt-5 max-w-md text-[14px] leading-[1.75] text-[#a9a9b0]">
				Your E-WIN Hub account is the front door to Guru AI. Sign in once and every studio, workflow, note and audit record follows you.
			</p>
			<ul class="mt-8 space-y-3.5">
				{#each [
					{ title: "Hub-verified sessions", copy: "Credentials are checked against the central E-WIN hub, then bound to an opaque local session." },
					{ title: "One workspace, one record", copy: "Role, plan and governance follow the same identity across the ecosystem." },
					{ title: "Ready on every device", copy: "Installable PWA with a shared design system on desktop, tablet and mobile." }
				] as point (point.title)}
					<li class="flex gap-3">
						<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#2dd4a0]/40 bg-[#2dd4a0]/10 text-[10px] text-[#2dd4a0]">✓</span>
						<span>
							<span class="block text-[12.5px] font-bold text-white">{point.title}</span>
							<span class="mt-0.5 block text-[11px] leading-relaxed text-[#8f9098]">{point.copy}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>

		<div class="relative flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.14em] text-[#777880]">
			<span>Guru AI · E-WIN Project</span>
			<span class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-[#2dd4a0]"></span>Systems operational</span>
		</div>
	</section>

	<section class="relative flex min-h-screen flex-col">
		<header class="flex items-center justify-between px-5 py-5 sm:px-8">
			<a href="/" class="lg:hidden" aria-label="Guru AI home"><Logo size={30} compact tagline="" /></a>
			<a href="/" class="hidden items-center gap-1.5 text-[11.5px] font-semibold text-[var(--muted)] transition hover:text-[var(--ink)] lg:inline-flex">
				<span aria-hidden="true">←</span> Back to overview
			</a>
			<div class="flex items-center gap-2">
				<span class="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)] sm:block">Secure sign-in</span>
				<ThemeToggle />
			</div>
		</header>

		<div class="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
			<div class="w-full max-w-[420px] rise">
				<div class="mb-6">
					<p class="eyebrow">Welcome to Guru AI</p>
					<h2 class="mt-2.5 text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--ink)]">
						{mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
					</h2>
					<p class="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
						{mode === "signin"
							? "Use your E-WIN Hub identity or your Guru AI password. We verify both."
							: "Create a Guru AI account — or connect an existing E-WIN identity automatically."}
					</p>
				</div>

				<div class="flex items-center gap-2 rounded-xl border border-[var(--sky-soft)] bg-[var(--sky-soft)] px-3 py-2.5">
					<span class="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--sky)]">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3.4 20 6v5.4c0 4.5-3.4 7.6-8 9.4-4.6-1.8-8-4.9-8-9.4V6z" /><path d="m8.7 11.7 2.2 2.2 4.4-4.4" /></svg>
					</span>
					<p class="text-[10.5px] leading-snug text-[var(--ink-soft)]">
						<span class="font-bold">E-WIN Hub connected.</span> Your hub identity is verified server-to-server.
					</p>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1">
					<button
						type="button"
						class="rounded-lg px-3 py-2 text-[12px] font-bold transition {mode === 'signin' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}"
						onclick={() => switchMode("signin")}>Sign in</button
					>
					<button
						type="button"
						class="rounded-lg px-3 py-2 text-[12px] font-bold transition {mode === 'signup' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}"
						onclick={() => switchMode("signup")}>Create account</button
					>
				</div>

				{#if !convexReady}
					<div class="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-[#e0a800]">
						The backend is not connected, so accounts cannot be verified. Set <code class="rounded bg-black/10 px-1">VITE_CONVEX_URL</code> and rebuild.
					</div>
				{/if}

				<form class="mt-4 space-y-3.5" onsubmit={submit}>
					{#if mode === "signup"}
						<div>
							<label class="guru-label" for="name">Name</label>
							<input id="name" class="guru-input" bind:value={name} placeholder="Ada Lovelace" autocomplete="name" />
						</div>
					{/if}
					<div>
						<label class="guru-label" for="email">Work email</label>
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
						<div class="flex items-center justify-between">
							<label class="guru-label" for="password">Password</label>
							{#if mode === "signin"}
								<a class="mb-1 text-[10px] font-semibold text-[var(--sky)] hover:underline" href="https://ewinproject.org/login">Managed by E-WIN Hub</a>
							{/if}
						</div>
						<div class="relative">
							<input
								id="password"
								type={showPassword ? "text" : "password"}
								class="guru-input pr-11"
								bind:value={password}
								placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
								autocomplete={mode === "signup" ? "new-password" : "current-password"}
								required
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? "Hide" : "Show"}
							</button>
						</div>
					</div>
					{#if mode === "signup"}
						<div>
							<label class="guru-label" for="confirm">Confirm password</label>
							<input
								id="confirm"
								type={showPassword ? "text" : "password"}
								class="guru-input"
								bind:value={confirm}
								placeholder="Repeat your password"
								autocomplete="new-password"
								required
							/>
							{#if confirm && confirm !== password}
								<p class="mt-1 text-[10.5px] text-[var(--accent)]">Passwords do not match yet.</p>
							{/if}
						</div>
					{/if}

					{#if error}
						<div class="rounded-lg border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--accent)]" role="alert">
							{error}
							{#if hubRetry}
								<button type="button" class="mt-2 block font-bold underline underline-offset-2" onclick={retryWithHub} disabled={busy}>
									Retry directly with E-WIN Hub
								</button>
							{/if}
						</div>
					{/if}

					<button class="guru-btn guru-btn-primary w-full !py-2.5" type="submit" disabled={busy || !valid}>
						{#if busy}
							<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span>
							{mode === "signin" ? "Verifying identity…" : "Creating account…"}
						{:else}
							{mode === "signin" ? "Sign in" : "Create account"} <span aria-hidden="true">→</span>
						{/if}
					</button>
				</form>

				<div class="my-4 flex items-center gap-3 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
					<span class="h-px flex-1 bg-[var(--line)]"></span> or continue with <span class="h-px flex-1 bg-[var(--line)]"></span>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<button class="guru-btn guru-btn-ghost !px-3 !text-[11.5px]" onclick={() => startOAuth("google")} disabled={!httpSite}>
						<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"/><path fill="currentColor" opacity=".72" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="currentColor" opacity=".5" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="currentColor" opacity=".85" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2 10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9Z"/></svg>
						Google
					</button>
					<button class="guru-btn guru-btn-ghost !px-3 !text-[11.5px]" onclick={() => startOAuth("github")} disabled={!httpSite}>
						<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.7 9c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>
						GitHub
					</button>
				</div>

				<p class="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
					{mode === "signin"
						? "Guru AI verifies E-WIN Hub credentials server-to-server, then binds the session to your local account. Your hub password is never stored."
						: "Creating an account with an existing E-WIN email automatically adopts your verified hub identity. The super-admin email is promoted on first sign-in."}
				</p>
			</div>
		</div>

		<footer class="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-5 py-4 text-[9.5px] uppercase tracking-[0.12em] text-[var(--muted)] sm:px-8">
			<span>© {new Date().getFullYear()} Guru AI · E-WIN Project</span>
			<span class="flex items-center gap-3"><a class="hover:text-[var(--ink)]" href="/">Overview</a><a class="hover:text-[var(--ink)]" href="mailto:support@ewinproject.org">Support</a></span>
		</footer>
	</section>
</div>
