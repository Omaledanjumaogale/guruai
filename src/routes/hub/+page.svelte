<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { account, connectEwinIdentity, describeError, disconnectEwinIdentity, session } from "$lib/auth";
	import { gq } from "$lib/convex";
	import { toastOk } from "$lib/stores";

	const S_hub = $derived($session ? gq<any>("hub.status", { token: $session }) : null);
	const hub = $derived(S_hub ? $S_hub : null);
	const linked = $derived(Boolean(hub?.connected));

	let email = $state("");
	let password = $state("");
	let busy = $state(false);
	let error = $state("");
	let confirming = $state(false);
	let prefilled = $state(false);

	$effect(() => {
		if (!prefilled && ($account?.email || hub?.hubEmail)) {
			email = hub?.hubEmail ?? $account?.email ?? "";
			prefilled = true;
		}
	});

	async function connect(e: Event) {
		e.preventDefault();
		if (busy || !$session) return;
		busy = true;
		error = "";
		try {
			await connectEwinIdentity($session, email, password);
			password = "";
			confirming = false;
			toastOk("E-WIN Hub identity connected");
		} catch (err) {
			error = describeError(err);
		} finally {
			busy = false;
		}
	}

	async function disconnect() {
		if (busy || !$session) return;
		busy = true;
		error = "";
		try {
			await disconnectEwinIdentity($session);
			confirming = false;
			toastOk("E-WIN Hub identity disconnected");
		} catch (err) {
			error = describeError(err);
		} finally {
			busy = false;
		}
	}

	function copyId() {
		if (!hub?.hubId) return;
		navigator.clipboard?.writeText(hub.hubId);
		toastOk("Hub identity copied");
	}

	const services = [
		{ name: "E-WIN Hub", copy: "Central identity, sessions and account profile", href: "https://ewinproject.org" },
		{ name: "Guru AI", copy: "This workspace — creation, research and governance", href: "/home" },
		{ name: "Identity provider", copy: "Better Auth endpoint used for server-to-server verification", href: "https://affable-dragon-883.eu-west-1.convex.site" },
		{ name: "Support", copy: "Account, access and workspace help", href: "mailto:support@ewinproject.org" }
	];
</script>

<svelte:head>
	<title>E-WIN Hub · Guru AI</title>
</svelte:head>

<PageHeader eyebrow="Ecosystem" title="E-WIN Hub" blurb="One verified identity across Guru AI and the wider E-WIN ecosystem. The hub owns the credential; Guru AI keeps an opaque session and a linked local profile.">
	<a class="guru-btn guru-btn-ghost" href="https://ewinproject.org" target="_blank" rel="noreferrer">Open hub ↗</a>
</PageHeader>

{#if !$session}
	<div class="guru-card p-8 text-center">
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sky-soft)] text-[var(--sky)]"><Icon name="hub" size={22} /></div>
		<h2 class="mt-4 text-lg font-extrabold text-[var(--ink)]">Sign in to manage your hub identity</h2>
		<p class="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]">The hub link is bound to your signed-in Guru AI account.</p>
		<a class="guru-btn guru-btn-primary mt-5" href="/login?next=/hub">Sign in</a>
	</div>
{:else}
	<div class="space-y-4">
		<section class="relative overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-7">
			<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_0%,rgba(56,189,248,0.14),transparent_46%)]"></div>
			<div class="relative flex flex-wrap items-center justify-between gap-5">
				<div class="flex items-center gap-4">
					<span class="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--sky)]"><Icon name="hub" size={26} /></span>
					<div>
						<p class="eyebrow">Central identity</p>
						<h2 class="mt-1 text-[20px] font-extrabold tracking-tight text-[var(--ink)]">{linked ? "Verified and linked" : hub ? "Ready to connect" : "Checking connection…"}</h2>
						<p class="mt-1 text-[11.5px] text-[var(--muted)]">{hub?.hubEmail ?? $account?.email ?? "No local account"}</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="guru-chip {hub ? (linked ? 'guru-chip-green' : 'guru-chip-sky') : ''}">{hub ? (linked ? "Active" : "Not linked") : "Checking"}</span>
					{#if hub?.hubAppUrl}<a class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-[11px]" href={hub.hubAppUrl} target="_blank" rel="noreferrer">Hub profile ↗</a>{/if}
				</div>
			</div>

			<div class="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
					<p class="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">Hub identity</p>
					<p class="mt-1.5 truncate font-mono text-[11px] text-[var(--ink)]">{hub?.hubId ?? "—"}</p>
				</div>
				<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
					<p class="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">Local account</p>
					<p class="mt-1.5 truncate text-[11.5px] font-semibold text-[var(--ink)]">{$account?.email ?? "—"}</p>
				</div>
				<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
					<p class="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">Provider</p>
					<p class="mt-1.5 truncate text-[11.5px] font-semibold text-[var(--ink)]">{$account?.provider === "ewin" ? "E-WIN" : ($account?.provider ?? "Password")}</p>
				</div>
				<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
					<p class="text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">Linked</p>
					<p class="mt-1.5 truncate text-[11.5px] font-semibold text-[var(--ink)]">{hub?.linkedAt ? new Date(hub.linkedAt).toLocaleDateString() : "—"}</p>
				</div>
			</div>
		</section>

		<div class="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
			<section class="guru-card p-5">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">{linked ? "Reconnect or refresh" : "Connect your hub identity"}</h2>
						<p class="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Credentials are verified by the hub, never stored. The local link is written only after the hub confirms the session.</p>
					</div>
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon name="security" size={15} /></span>
				</div>

				{#if hub && hub.configured === false}
					<div class="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
						The hub bridge is not configured on this deployment. Set <code class="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-[10px]">EWIN_HUB_SITE_URL</code> and redeploy Convex.
					</div>
				{:else}
					<form class="space-y-3" onsubmit={connect}>
						<div>
							<label class="guru-label" for="hub-email">E-WIN email</label>
							<input id="hub-email" type="email" class="guru-input" bind:value={email} autocomplete="email" required />
						</div>
						<div>
							<label class="guru-label" for="hub-password">Hub password</label>
							<input id="hub-password" type="password" class="guru-input" bind:value={password} autocomplete="current-password" required placeholder="Verified by the central hub" />
						</div>
						{#if error}<p class="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-[11px] text-[var(--accent)]" role="alert">{error}</p>{/if}
						<button class="guru-btn guru-btn-primary w-full" type="submit" disabled={busy || !email || !password}>
							{busy ? "Verifying with E-WIN…" : linked ? "Reconnect identity" : "Verify and connect"}
						</button>
					</form>
				{/if}

				{#if linked}
					<div class="mt-5 border-t border-[var(--line)] pt-4">
						{#if confirming}
							<p class="text-[11.5px] leading-relaxed text-[var(--muted)]">Disconnecting removes the hub link but keeps your Guru AI account and password. Hub-only sign-in will stop working until you reconnect.</p>
							<div class="mt-2 flex gap-2">
								<button class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-[11px]" onclick={disconnect} disabled={busy}>Disconnect</button>
								<button class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-[11px]" onclick={() => (confirming = false)}>Cancel</button>
							</div>
						{:else}
							<button class="text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]" onclick={() => (confirming = true)}>Disconnect this hub identity</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="guru-card p-5">
				<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">What synchronises</h2>
				<ul class="mt-3 space-y-2.5">
					{#each [
						{ label: "Identity", copy: "Hub user id, email and display name", done: linked },
						{ label: "Access", copy: "Role, plan and workspace permissions", done: Boolean($account) },
						{ label: "Security", copy: "Opaque sessions with owner-controlled revocation", done: Boolean($session) },
						{ label: "Governance", copy: "Audit trail for every link, sync and revoke", done: true }
					] as row (row.label)}
						<li class="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3">
							<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full {row.done ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--surface)] text-[var(--muted)]'} text-[10px]">{row.done ? "✓" : "·"}</span>
							<span><span class="block text-[11.5px] font-bold text-[var(--ink)]">{row.label}</span><span class="mt-0.5 block text-[10.5px] text-[var(--muted)]">{row.copy}</span></span>
						</li>
					{/each}
				</ul>
				{#if hub?.hubId}
					<button class="mt-3 text-[10px] font-semibold text-[var(--sky)] hover:underline" onclick={copyId}>Copy hub identity</button>
				{/if}
			</section>
		</div>

		<section class="guru-card p-5">
			<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Ecosystem directory</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
				{#each services as s (s.name)}
					<a href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" class="group rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 transition hover:border-[var(--sky)]">
						<div class="flex items-center justify-between">
							<p class="text-[11.5px] font-bold text-[var(--ink)]">{s.name}</p>
							<span class="text-[var(--muted)] transition group-hover:text-[var(--sky)]" aria-hidden="true">↗</span>
						</div>
						<p class="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">{s.copy}</p>
					</a>
				{/each}
			</div>
		</section>
	</div>
{/if}
