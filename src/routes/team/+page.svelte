<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { session } from "$lib/auth";
	import { gq } from "$lib/convex";
	import { can, type Me } from "$lib/access";

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const allowed = $derived(Boolean(me && can(me, "admin.users.read")));
	const S_team = $derived($session && allowed ? gq<any>("team.directory", { token: $session }) : null);
	const team = $derived(S_team ? $S_team : null);
	const members = $derived<any[]>(team?.members ?? []);

	let q = $state("");
	const filtered = $derived(
		q.trim()
			? members.filter((m) => (m.name + " " + m.email + " " + m.roles.join(" ")).toLowerCase().includes(q.trim().toLowerCase()))
			: members
	);

	function initials(name: string) {
		return String(name || "?")
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase())
			.join("");
	}
	function when(at: number) {
		if (!at) return "never";
		const diff = Date.now() - at;
		if (diff < 86_400_000) return "today";
		if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + "d ago";
		return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
	}
	const roleTone = (r: string) => (r === "admin" ? "guru-chip-accent" : r === "manager" ? "guru-chip-sky" : "guru-chip-green");
</script>

<svelte:head>
	<title>Team · Guru AI</title>
</svelte:head>

<PageHeader eyebrow="Organization" title="Team directory" blurb="Who is in the workspace, how they sign in, which plan they hold and whether their E-WIN identity is linked.">
	{#if me && can(me, "admin.users.manage")}<a class="guru-btn guru-btn-primary" href="/admin">Manage accounts</a>{:else}<a class="guru-btn guru-btn-ghost" href="/roles">Roles →</a>{/if}
</PageHeader>

{#if !$session}
	<div class="guru-card p-8 text-center">
		<h2 class="text-lg font-extrabold text-[var(--ink)]">Sign in to view the team</h2>
		<a class="guru-btn guru-btn-primary mt-4" href="/login?next=/team">Sign in</a>
	</div>
{:else if me && !allowed}
	<div class="guru-card p-8 text-center">
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Icon name="lock" size={22} /></div>
		<h2 class="mt-4 text-lg font-extrabold text-[var(--ink)]">Manager access required</h2>
		<p class="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]">The directory is available to workspace managers and admins. Request the Workspace Manager role to review your team.</p>
		<a class="guru-btn guru-btn-ghost mt-4" href="/roles">Request a role</a>
	</div>
{:else}
	<div class="space-y-4">
		<section class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
			{#each [
				{ label: "Accounts", value: team?.counts?.total ?? "—", icon: "team" },
				{ label: "Active", value: team?.counts?.active ?? "—", icon: "profile" },
				{ label: "Hub linked", value: team?.counts?.hubLinked ?? "—", icon: "hub" },
				{ label: "Admins", value: team?.counts?.admins ?? "—", icon: "admin" },
				{ label: "Suspended", value: team?.counts?.suspended ?? "—", icon: "lock" }
			] as stat (stat.label)}
				<div class="guru-card px-4 py-4">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]"><Icon name={stat.icon} size={15} /></span>
					<p class="mt-3 text-[24px] font-extrabold leading-none tracking-tight text-[var(--ink)]">{stat.value}</p>
					<p class="mt-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{stat.label}</p>
				</div>
			{/each}
		</section>

		<section class="guru-card overflow-hidden">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
				<div>
					<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">People</h2>
					<p class="mt-0.5 text-[10.5px] text-[var(--muted)]">{filtered.length} of {members.length} visible accounts</p>
				</div>
				<label class="relative w-full sm:w-64">
					<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><Icon name="search" size={13} /></span>
					<input class="guru-input !py-2 !pl-9 !text-[11.5px]" bind:value={q} placeholder="Search name, email or role" aria-label="Search team" />
				</label>
			</div>

			{#if team === null}
				<p class="px-5 py-8 text-center text-[12px] text-[var(--muted)]">Loading directory…</p>
			{:else if filtered.length === 0}
				<p class="px-5 py-8 text-center text-[12px] text-[var(--muted)]">No accounts match “{q}”.</p>
			{:else}
				<div class="hidden border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)] lg:grid lg:grid-cols-[1.6fr_0.9fr_0.7fr_0.65fr_0.6fr] lg:gap-3">
					<span>Account</span><span>Roles</span><span>Plan</span><span>Identity</span><span class="text-right">Last active</span>
				</div>
				<ul class="divide-y divide-[var(--line)]">
					{#each filtered as m (m.email)}
						<li class="grid gap-2 px-5 py-3.5 transition hover:bg-[var(--surface-2)] lg:grid-cols-[1.6fr_0.9fr_0.7fr_0.65fr_0.6fr] lg:items-center lg:gap-3">
							<div class="flex min-w-0 items-center gap-2.5">
								<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-extrabold text-[var(--ink)] ring-1 ring-[var(--line)]">{initials(m.name)}</span>
								<div class="min-w-0">
									<p class="truncate text-[11.5px] font-bold text-[var(--ink)]">{m.name} {#if m.email === me?.account?.email}<span class="ml-1 text-[8.5px] font-bold uppercase tracking-wider text-[var(--muted)]">you</span>{/if}</p>
									<p class="truncate text-[10px] text-[var(--muted)]">{m.email}</p>
								</div>
							</div>
							<div class="flex flex-wrap gap-1">
								<span class="guru-chip !py-0.5 !text-[8px] {roleTone(m.baseRole)}">{m.baseRole}</span>
								{#each m.roles as r (r)}<span class="guru-chip !py-0.5 !text-[8px]">{r}</span>{/each}
								{#if m.pendingRoles?.length}<span class="guru-chip guru-chip-sky !py-0.5 !text-[8px]">pending</span>{/if}
							</div>
							<div class="flex items-center gap-1.5 lg:block">
								<span class="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] lg:hidden">Plan</span>
								<span class="text-[10.5px] font-semibold text-[var(--ink-soft)]">{m.plan}</span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] lg:hidden">Identity</span>
								{#if m.hubLinked}<span class="guru-chip guru-chip-green !py-0.5 !text-[8px]">E-WIN</span>{:else}<span class="guru-chip !py-0.5 !text-[8px]">{m.provider}</span>{/if}
								{#if m.status !== "active"}<span class="guru-chip guru-chip-accent !py-0.5 !text-[8px]">{m.status}</span>{/if}
							</div>
							<div class="text-left lg:text-right">
								<span class="text-[9.5px] text-[var(--muted)]">{when(m.lastLoginAt)}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
			<p class="text-[10.5px] leading-relaxed text-[var(--muted)]">Managers see the directory; only admins can suspend accounts, change roles or grant plans.</p>
			<div class="flex gap-2">
				<a class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-[10.5px]" href="/roles">Role catalogue</a>
				{#if can(me, "admin.users.manage")}<a class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-[10.5px]" href="/admin">Open console</a>{/if}
			</div>
		</div>
	</div>
{/if}
