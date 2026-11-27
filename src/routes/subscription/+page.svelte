<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { gq, mx } from "$lib/convex";
	import { session } from "$lib/auth";
	import { toastOk, toastErr } from "$lib/stores";
	import { can, type Me } from "$lib/access";

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_plans = $derived(gq<any[]>("subscriptions.plans", {}));
	const plans = $derived($S_plans ? ($S_plans ?? []) : null);
	const S_mine = $derived($session ? gq<any>("subscriptions.me", { token: $session }) : null);
	const mine = $derived(S_mine ? $S_mine : null);
	const canManage = $derived(can(me, "subscription.manage"));
	const S_overview = $derived($session && canManage ? gq<any>("subscriptions.overview", { token: $session }) : null);
	const overview = $derived(S_overview ? $S_overview : null);

	let grantEmail = $state("");
	let grantPlan = $state("pro");
	let grantNote = $state("");
	let busy = $state("");

	const current = $derived(mine?.plan ?? me?.plan ?? null);
	const history = $derived(mine?.history ?? []);
	const FEATURE_LABELS: Record<string, string> = {
		chat: "Multi-model chat", images: "Image Studio", humanizer: "Humanizer", notes: "Notes",
		convert: "File & unit conversion", keywords: "Keyword intelligence", transcript: "Transcripts", tools: "AI Toolbox",
		video: "Video Studio", music: "Music Studio", visuals: "Visual diagrams", agents: "Multi-step agents",
		"reverse-api": "Reverse API Lab", "priority-support": "Priority support", admin: "Admin console",
		broadcasts: "Announcements", audit: "Audit trail", messaging: "Managed messaging"
	};

	async function grant() {
		if (!$session || busy) return;
		busy = "grant";
		try {
			await mx("subscriptions.grant", { token: $session, email: grantEmail.trim(), planKey: grantPlan, note: grantNote || undefined });
			toastOk(`Plan granted: ${grantPlan}.`);
			grantEmail = "";
			grantNote = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function cancel(email: string) {
		if (!$session || busy) return;
		busy = `cancel:${email}`;
		try {
			await mx("subscriptions.cancel", { token: $session, email, note: "Cancelled from the admin console" });
			toastOk("Plan cancelled; the account is back on Starter.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}
</script>

<PageHeader title="Plan & entitlements" blurb="Your plan decides what the workspace unlocks. Engines still run on keys you own." />

<div class="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
	<span class="grid h-8 w-8 place-items-center rounded-lg bg-[var(--sky-soft)] text-[var(--sky)]" aria-hidden="true">◎</span>
	<p class="min-w-0 flex-1 text-[11.5px] leading-relaxed text-[var(--muted)]">
		<strong class="text-[var(--ink)]">Local entitlement record.</strong> E-WIN central wallet billing is not active for Guru AI, so this page cannot create a charge. Central balances and receipts live in the E-WIN Hub.
	</p>
	<a class="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--sky)] hover:underline" href="/hub">Hub connection →</a>
</div>

<section class="grid gap-3 sm:grid-cols-3">
	{#if current}
		<div class="guru-card p-5 sm:col-span-2">
			<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Current plan</p>
			<h2 class="mt-1 text-2xl font-bold tracking-tight text-[var(--ink)]">{current.name}</h2>
			<p class="mt-1 text-sm text-[var(--ink-soft)]">{current.priceLabel}</p>
			<p class="mt-2 text-xs text-[var(--muted)]">
				{#if current.startedAt}Active since {new Date(current.startedAt).toLocaleDateString()}{/if}
				{#if current.renewsAt} · renews {new Date(current.renewsAt).toLocaleDateString()}{/if}
			</p>
			<div class="mt-4 flex flex-wrap gap-1.5">
				{#each current.entitlements as feature (feature)}
					<span class="guru-chip border-[var(--green)]/30 bg-[var(--green-soft)] text-[var(--green)]">{FEATURE_LABELS[feature] ?? feature}</span>
				{/each}
			</div>
		</div>
	{:else}
		<div class="guru-card p-5 sm:col-span-2"><div class="guru-skeleton h-24 w-full"></div></div>
	{/if}
	<div class="guru-card p-5">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Account</h2>
		{#if $session}
			<p class="mt-2 truncate text-sm text-[var(--ink)]">{me?.account.email}</p>
			<p class="text-xs text-[var(--muted)]">{me?.roleKeys.join(" · ") || "Member"}</p>
			<a class="guru-btn guru-btn-ghost mt-3 !px-3 !py-1.5 !text-xs" href="/roles">Role access</a>
		{:else}
			<p class="mt-2 text-sm text-[var(--ink-soft)]">Sign in to see your plan.</p>
			<a class="guru-btn guru-btn-primary mt-3" href="/login">Sign in</a>
		{/if}
	</div>
</section>

<section class="mt-8" aria-labelledby="plans-title">
	<h2 id="plans-title" class="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Plans</h2>
	<div class="mt-3 grid gap-4 md:grid-cols-3">
		{#if !plans}
			{#each Array.from({ length: 3 }) as _, i (i)}<div class="guru-card p-5"><div class="guru-skeleton h-40 w-full"></div></div>{/each}
		{:else}
			{#each plans as plan (plan.key)}
				<article class="guru-card p-5 {current?.key === plan.key ? 'border-[var(--accent)]' : ''}">
					<div class="flex items-start justify-between gap-2">
						<div>
							<h3 class="text-base font-semibold text-[var(--ink)]">{plan.name}</h3>
							<p class="text-[11px] text-[var(--muted)]">{plan.priceLabel}</p>
						</div>
						{#if current?.key === plan.key}<span class="guru-chip border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">Current</span>{/if}
					</div>
					<p class="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">{plan.description}</p>
					<ul class="mt-3 space-y-1">
						{#each plan.entitlements as feature (feature)}
							<li class="text-[11px] text-[var(--ink-soft)]">✓ {FEATURE_LABELS[feature] ?? feature}</li>
						{/each}
					</ul>
				</article>
			{/each}
		{/if}
	</div>
</section>

{#if $session && history.length}
	<section class="mt-8 guru-card p-5">
		<h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Plan history</h2>
		<ul class="mt-3 divide-y divide-[var(--line)]">
			{#each history as row (row._id)}
				<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
					<span class="text-[var(--ink-soft)]">{row.planKey} · {row.status}</span>
					<span class="text-[var(--muted)]">{new Date(row.startedAt).toLocaleDateString()}{row.grantedBy ? ` · by ${row.grantedBy}` : ""}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if canManage}
	<section class="mt-8 grid gap-4 lg:grid-cols-2">
		<form class="guru-card p-5" onsubmit={(e) => { e.preventDefault(); grant(); }}>
			<h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Grant a plan</h2>
			<p class="mt-1 text-xs text-[var(--muted)]">Changing a plan closes the previous subscription and notifies the member.</p>
			<label class="mt-3 block"><span class="guru-label">Member email</span><input class="guru-input mt-1" type="email" required bind:value={grantEmail} placeholder="member@company.com" /></label>
			<label class="mt-3 block"><span class="guru-label">Plan</span><select class="guru-input mt-1" bind:value={grantPlan}><option value="starter">Starter</option><option value="pro">Pro Studio</option><option value="enterprise">Enterprise</option></select></label>
			<label class="mt-3 block"><span class="guru-label">Note</span><input class="guru-input mt-1" bind:value={grantNote} maxlength="300" placeholder="Why this change? (audit)" /></label>
			<button class="guru-btn guru-btn-primary mt-4" type="submit" disabled={busy === "grant"}>{busy === "grant" ? "Granting…" : "Grant plan"}</button>
		</form>
		<div class="guru-card p-5">
			<h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Distribution</h2>
			{#if !overview}
				<div class="guru-skeleton mt-3 h-20 w-full"></div>
			{:else}
				<p class="mt-2 text-xs text-[var(--muted)]">{overview.activeCount} active subscription{overview.activeCount === 1 ? "" : "s"}</p>
				<ul class="mt-3 space-y-2">
					{#each overview.plans as plan (plan.key)}
						<li class="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs">
							<span class="text-[var(--ink-soft)]">{plan.name}</span>
							<span class="font-semibold text-[var(--ink)]">{overview.counts[plan.key] ?? 0}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-3 text-[11px] text-[var(--muted)]">Cancel a plan from the admin console → Accounts, or ask the member to contact support.</p>
			{/if}
		</div>
	</section>
{/if}