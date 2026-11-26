<script lang="ts">
	import { goto } from "$app/navigation";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { account, describeError, logout, session } from "$lib/auth";
	import { gq, mx } from "$lib/convex";
	import { toastOk } from "$lib/stores";

	const S_sessions = $derived($session ? gq<any[]>("auth.sessions", { token: $session }) : null);
	const sessions = $derived(S_sessions ? $S_sessions : null);
	const S_hub = $derived($session ? gq<any>("hub.status", { token: $session }) : null);
	const hub = $derived(S_hub ? $S_hub : null);
	const S_audit = $derived($session ? gq<any[]>("audit.mine", { token: $session }) : null);
	const audit = $derived(S_audit ? $S_audit : null);

	let busy = $state("");
	let error = $state("");
	let confirmingAll = $state(false);

	async function revoke(id: string) {
		if (busy || !$session) return;
		busy = id;
		error = "";
		try {
			await mx("auth.revokeSession", { token: $session, sessionId: id });
			toastOk("Session ended");
		} catch (err) {
			error = describeError(err);
		} finally {
			busy = "";
		}
	}

	async function revokeOthers() {
		if (busy || !$session) return;
		busy = "all";
		error = "";
		try {
			const res = await mx<{ removed: number }>("auth.revokeOtherSessions", { token: $session });
			toastOk(res.removed ? res.removed + " other session(s) ended" : "No other sessions were active");
			confirmingAll = false;
		} catch (err) {
			error = describeError(err);
		} finally {
			busy = "";
		}
	}

	const labels: Record<string, string> = {
		"auth.login": "Password sign-in",
		"auth.register": "Account created",
		"auth.logout": "Signed out",
		"auth.hub_synced": "Hub identity synchronised",
		"auth.hub_provisioned": "Account provisioned from hub",
		"identity.hub_linked": "Hub identity linked",
		"identity.hub_unlinked": "Hub identity disconnected",
		"security.sessions_revoked": "Other sessions ended",
		"security.session_revoked": "Session ended",
		"profile.updated": "Profile updated"
	};
	function labelFor(action: string) {
		return labels[action] ?? action.replace(/[._]/g, " ");
	}
	function when(at: number) {
		const diff = Date.now() - at;
		if (diff < 60_000) return "just now";
		if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
		if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
		return new Date(at).toLocaleDateString();
	}
	function daysLeft(at: number) {
		return Math.max(0, Math.ceil((at - Date.now()) / 86_400_000));
	}
	async function signOutNow() {
		await logout();
		await goto("/login");
	}
</script>

<svelte:head>
	<title>Security · Guru AI</title>
</svelte:head>

<PageHeader eyebrow="Account" title="Security" blurb="Sessions, identity links and the security events tied to your account. You stay in control of every device.">
	<a class="guru-btn guru-btn-ghost" href="/hub"><Icon name="hub" size={14} /> E-WIN identity</a>
</PageHeader>

{#if !$session}
	<div class="guru-card p-8 text-center">
		<h2 class="text-lg font-extrabold text-[var(--ink)]">Sign in to review security</h2>
		<p class="mt-2 text-[12.5px] text-[var(--muted)]">Sessions and events are scoped to your signed-in account.</p>
		<a class="guru-btn guru-btn-primary mt-5" href="/login?next=/security">Sign in</a>
	</div>
{:else}
	<div class="space-y-4">
		{#if error}<div class="rounded-lg border border-[var(--line)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-[11.5px] text-[var(--accent)]" role="alert">{error}</div>{/if}

		<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{#each [
				{ label: "Active sessions", value: String(sessions?.length ?? 0), icon: "security", tone: "sky" },
				{ label: "Identity", value: hub?.connected ? "Hub linked" : "Local only", icon: "hub", tone: hub?.connected ? "green" : "neutral" },
				{ label: "Account", value: $account?.role === "admin" ? "Super admin" : "Member", icon: "profile", tone: "neutral" },
				{ label: "Security events", value: String(audit?.length ?? 0), icon: "activity", tone: "neutral" }
			] as stat (stat.label)}
				<div class="guru-card px-4 py-4">
					<div class="flex items-center justify-between">
						<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]"><Icon name={stat.icon} size={15} /></span>
						<span class="guru-chip !py-0.5 !text-[8px] {stat.tone === 'green' ? 'guru-chip-green' : stat.tone === 'sky' ? 'guru-chip-sky' : ''}">{stat.label}</span>
					</div>
					<p class="mt-3 truncate text-[19px] font-extrabold tracking-tight text-[var(--ink)]">{stat.value}</p>
				</div>
			{/each}
		</section>

		<div class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
			<section class="guru-card p-5">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Devices &amp; sessions</h2>
					{#if sessions && sessions.length > 1}
						{#if confirmingAll}
							<span class="flex items-center gap-1.5 text-[10px]">
								<button class="guru-btn guru-btn-ghost !px-2 !py-1 !text-[10px]" onclick={revokeOthers} disabled={busy === "all"}>Confirm</button>
								<button class="guru-btn guru-btn-ghost !px-2 !py-1 !text-[10px]" onclick={() => (confirmingAll = false)}>Cancel</button>
							</span>
						{:else}
							<button class="text-[10.5px] font-semibold text-[var(--accent)] hover:underline" onclick={() => (confirmingAll = true)}>End all other sessions</button>
						{/if}
					{/if}
				</div>
				{#if sessions === null}
					<p class="py-4 text-[12px] text-[var(--muted)]">Loading sessions…</p>
				{:else}
					<ul class="divide-y divide-[var(--line)]">
						{#each sessions as s (s.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-3">
								<div class="flex items-start gap-2.5">
									<span class="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg {s.current ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--surface-2)] text-[var(--muted)]'}"><Icon name="security" size={13} /></span>
									<div>
										<p class="text-[11.5px] font-bold text-[var(--ink)]">
											{s.current ? "This device" : "Session"} <span class="font-mono text-[9.5px] font-normal text-[var(--muted)]">…{String(s.id).replace(/[^a-z0-9]/gi, "").slice(-6)}</span>
										</p>
										<p class="mt-0.5 text-[10px] text-[var(--muted)]">Started {when(s.createdAt)} · expires in {daysLeft(s.expiresAt)} day{daysLeft(s.expiresAt) === 1 ? "" : "s"}</p>
									</div>
								</div>
								{#if s.current}
									<span class="guru-chip guru-chip-green !py-0.5 !text-[8px]">Current</span>
								{:else}
									<button class="rounded-md border border-[var(--line)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]" onclick={() => revoke(s.id)} disabled={busy === s.id}>
										{busy === s.id ? "Ending…" : "End session"}
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				<button class="mt-4 text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]" onclick={signOutNow}>Sign out of this device →</button>
			</section>

			<section class="guru-card p-5">
				<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Credentials</h2>
				<dl class="mt-3 space-y-2.5 text-[11.5px]">
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Email</dt><dd class="truncate font-semibold text-[var(--ink)]">{$account?.email}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Sign-in method</dt><dd class="font-semibold capitalize text-[var(--ink)]">{$account?.provider}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">E-WIN hub</dt><dd class="font-semibold {hub?.connected ? 'text-[var(--green)]' : 'text-[var(--muted)]'}">{hub?.connected ? "Linked" : "Not linked"}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Hub email</dt><dd class="truncate font-semibold text-[var(--ink)]">{hub?.hubEmail ?? "—"}</dd></div>
				</dl>
				<p class="mt-3 border-t border-[var(--line)] pt-3 text-[10.5px] leading-relaxed text-[var(--muted)]">
					{hub?.connected
						? "Your password is verified and owned by the E-WIN central hub. Guru AI stores only a salted local hash after hub confirmation."
						: "This account signs in with its local Guru AI password. Connect the hub to use one identity across the ecosystem."}
				</p>
				<a class="mt-3 inline-flex text-[10.5px] font-semibold text-[var(--sky)] hover:underline" href="/hub">{hub?.connected ? "Manage hub link" : "Connect E-WIN Hub"} →</a>
			</section>
		</div>

		<section class="guru-card p-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Security activity</h2>
				<span class="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Last 20 events</span>
			</div>
			{#if !audit || audit.length === 0}
				<p class="py-3 text-[12px] text-[var(--muted)]">No security events recorded yet.</p>
			{:else}
				<ul class="divide-y divide-[var(--line)]">
					{#each audit as event (event._id)}
						<li class="flex items-center justify-between gap-3 py-2.5">
							<div class="flex min-w-0 items-center gap-2.5">
								<span class="h-1.5 w-1.5 shrink-0 rounded-full {event.outcome === 'success' ? 'bg-[var(--green)]' : 'bg-[var(--accent)]'}"></span>
								<div class="min-w-0">
									<p class="truncate text-[11.5px] font-semibold text-[var(--ink)]">{labelFor(event.action)}</p>
									{#if event.detail}<p class="truncate text-[10px] text-[var(--muted)]">{event.detail}</p>{/if}
								</div>
							</div>
							<span class="shrink-0 text-[9.5px] text-[var(--muted)]">{when(event.at)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}
