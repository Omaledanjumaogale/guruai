<script lang="ts">
	import StatusDot from "$lib/components/StatusDot.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { workspaceId, workspaceName } from "$lib/stores";
	import { gq } from "$lib/convex";
	import { NAV } from "$lib/nav";
	import { account, session } from "$lib/auth";
	import { can, type Me } from "$lib/access";

	const wid = $derived($workspaceId);
	const S_counts = $derived(wid ? gq<any>("usage.counts", { workspaceId: wid }) : null);
	const counts = $derived(S_counts ? $S_counts : null);
	const S_events = $derived(wid ? gq<any[]>("usage.recent", { workspaceId: wid, limit: 8 }) : null);
	const events = $derived(S_events ? $S_events : null);
	const S_connectors = $derived(wid ? gq<any[]>("connectors.list", { workspaceId: wid }) : null);
	const connectors = $derived(S_connectors ? $S_connectors : null);
	const S_chats = $derived(wid ? gq<any[]>("chats.list", { workspaceId: wid }) : null);
	const chats = $derived(S_chats ? $S_chats : null);
	const S_agents = $derived(wid ? gq<any[]>("agents.list", { workspaceId: wid }) : null);
	const agents = $derived(S_agents ? $S_agents : null);
	const S_notes = $derived(wid ? gq<any[]>("notes.list", { workspaceId: wid }) : null);
	const notes = $derived(S_notes ? $S_notes : null);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_subs = $derived($session ? gq<any>("subscriptions.me", { token: $session }) : null);
	const plan = $derived(me?.plan ?? ($S_subs ? $S_subs.plan : null));
	const planLabel = $derived(me?.account?.role === "admin" ? "Enterprise" : (plan?.name ?? "Starter"));
	const S_hub = $derived($session ? gq<any>("hub.status", { token: $session }) : null);
	const hub = $derived(S_hub ? $S_hub : null);

	const displayName = $derived(me?.profile?.displayName ?? me?.account?.name ?? $account?.name ?? $workspaceName ?? "there");
	const firstName = $derived(String(displayName).split(" ")[0]);
	const greeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	});
	const today = $derived(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }));

	const stats = $derived([
		{ label: "Chats", value: chats?.length ?? 0, href: "/chat", icon: "chat", note: "conversations" },
		{ label: "Notes", value: notes?.length ?? 0, href: "/notes", icon: "notes", note: "captured" },
		{ label: "Agents", value: agents?.length ?? 0, href: "/agents", icon: "agents", note: "workflows" },
		{ label: "Connectors", value: connectors?.length ?? 0, href: "/connectors", icon: "connectors", note: "engines" },
		{ label: "Unread", value: me?.unreadNotifications ?? 0, href: "/notifications", icon: "notifications", note: "updates" }
	]);

	const quick = [
		{ href: "/chat", label: "Start a chat", icon: "chat", blurb: "GuruRoute picks the best model" },
		{ href: "/images", label: "Generate an image", icon: "images", blurb: "Text-to-image with DeepAI" },
		{ href: "/humanizer", label: "Humanize text", icon: "humanizer", blurb: "Rewrite into natural prose" },
		{ href: "/visuals", label: "Build a visual", icon: "visuals", blurb: "Napkin-style diagrams" },
		{ href: "/keywords", label: "Research keywords", icon: "keywords", blurb: "Questions and clusters" },
		{ href: "/agents", label: "Run an agent", icon: "agents", blurb: "Multi-step workflows" }
	];

	function moduleLabel(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.label ?? m;
	}
	function moduleIcon(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.href ?? "default";
	}
</script>

<svelte:head>
	<title>Dashboard · Guru AI</title>
</svelte:head>

<div class="space-y-5">
	<section class="relative overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
		<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(232,66,79,0.14),transparent_46%),radial-gradient(circle_at_0%_100%,rgba(56,189,248,0.1),transparent_42%)]"></div>
		<div class="pointer-events-none absolute right-8 top-6 hidden h-40 w-40 opacity-30 xl:block" style="background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 20px 20px; mask-image: radial-gradient(circle, black, transparent 72%);"></div>
		<div class="relative grid gap-8 xl:grid-cols-[1fr_340px] xl:items-center">
			<div>
				<p class="eyebrow">{today} · Workspace overview</p>
				<h1 class="mt-3 text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--ink)] sm:text-[36px]">
					{greeting}, <span class="font-display font-normal italic text-[var(--accent)]">{firstName}.</span>
				</h1>
				<p class="mt-2.5 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
					One workspace for chat, creation, research, conversion, automation and governance. Pick up where you left off, or open a new thread.
				</p>
				<div class="mt-5 flex flex-wrap items-center gap-2.5">
					<a class="guru-btn guru-btn-primary" href="/chat"><Icon name="chat" size={14} /> Open Chat</a>
					<a class="guru-btn guru-btn-ghost" href="/analytics"><Icon name="analytics" size={14} /> View analytics</a>
					{#if can(me, "admin.users.read")}<a class="guru-btn guru-btn-ghost" href="/admin"><Icon name="admin" size={14} /> Admin</a>{/if}
				</div>
			</div>

			{#if $session}
				<a
					href="/hub"
					class="relative block rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 transition hover:border-[var(--sky)]"
				>
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
							<Icon name="hub" size={14} /> E-WIN identity
						</span>
						<span class="guru-chip {hub?.connected ? 'guru-chip-green' : 'guru-chip-sky'} !py-0.5 !text-[8px]">
							{hub?.connected ? "Linked" : hub ? "Not linked" : "Checking"}
						</span>
					</div>
					<p class="mt-3 truncate text-[15px] font-bold tracking-tight text-[var(--ink)]">
						{hub?.hubEmail ?? $account?.email ?? "Central hub account"}
					</p>
					<p class="mt-1 text-[10.5px] leading-relaxed text-[var(--muted)]">
						{hub?.connected
							? "Verified by the central hub. One identity across the E-WIN ecosystem."
							: "Connect your hub identity to synchronise access across the ecosystem."}
					</p>
					<div class="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[10px] font-semibold text-[var(--sky)]">
						<span>{hub?.connected ? "Manage connection" : "Connect identity"}</span>
						<span aria-hidden="true">→</span>
					</div>
				</a>
			{/if}
		</div>
	</section>

	{#if $session && me}
		<div class="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-[11.5px]">
			<span class="guru-chip guru-chip-accent">{me.account.role === "admin" ? "Super admin" : me.roleKeys.join(", ") || "Member"}</span>
			<span class="text-[var(--muted)]">Plan <strong class="font-bold text-[var(--ink)]">{planLabel}</strong></span>
			<span class="h-3 w-px bg-[var(--line-strong)]"></span>
			<span class="text-[var(--muted)]">{me.permissions.length} permissions</span>
			{#if me.unreadNotifications > 0}
				<a href="/notifications" class="text-[var(--accent)] hover:underline">{me.unreadNotifications} unread notification{me.unreadNotifications === 1 ? "" : "s"}</a>
			{/if}
			<a href="/roles" class="ml-auto text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">Access details →</a>
		</div>
	{/if}

	<section class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Workspace statistics">
		{#each stats as s (s.label)}
			<a href={s.href} class="guru-card guru-card-hover group px-4 py-4">
				<div class="flex items-start justify-between">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] transition group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
						<Icon name={s.icon} size={15} />
					</span>
					<span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{s.note}</span>
				</div>
				<p class="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.04em] text-[var(--ink)]">{s.value}</p>
				<p class="mt-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{s.label}</p>
			</a>
		{/each}
	</section>

	<section class="grid gap-4 lg:grid-cols-3">
		<div class="guru-card p-5 lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Quick actions</h2>
				<a href="/tools" class="text-[10.5px] font-semibold text-[var(--accent)] hover:underline">All modules →</a>
			</div>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each quick as q (q.href)}
					<a href={q.href} class="group flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3 transition hover:border-[var(--accent)]">
						<span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--accent)]">
							<Icon name={q.icon} size={14} />
						</span>
						<span class="min-w-0">
							<span class="block text-[12px] font-bold text-[var(--ink)]">{q.label}</span>
							<span class="mt-0.5 block truncate text-[10.5px] text-[var(--muted)]">{q.blurb}</span>
						</span>
					</a>
				{/each}
			</div>
		</div>

		<div class="guru-card p-5">
			<h2 class="mb-3 flex items-center justify-between text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">
				Engines
				<a class="text-[10px] font-semibold normal-case tracking-normal text-[var(--sky)] hover:underline" href="/connectors">Manage</a>
			</h2>
			{#if connectors === null}
				<p class="text-[12px] text-[var(--muted)]">Loading…</p>
			{:else if connectors.length === 0}
				<p class="text-[11.5px] leading-relaxed text-[var(--muted)]">
					No connectors yet. Add a key in the
					<a class="font-semibold text-[var(--sky)] hover:underline" href="/connectors">Connector Vault</a>
					or let the <a class="font-semibold text-[var(--sky)] hover:underline" href="/reverse-api">Reverse API Lab</a> discover keys.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each connectors.slice(0, 4) as c (c._id)}
						<li class="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-2)] px-3 py-2">
							<div class="min-w-0">
								<p class="truncate text-[11.5px] font-bold text-[var(--ink)]">{c.provider}</p>
								<p class="truncate text-[9.5px] text-[var(--muted)]">{c.label}</p>
							</div>
							<StatusDot status={c.status} />
						</li>
					{/each}
				</ul>
			{/if}
			<a href="/hub" class="mt-4 flex items-center justify-between rounded-xl border border-[var(--sky-soft)] bg-[var(--sky-soft)] px-3 py-2.5 text-[10.5px] font-bold text-[var(--sky)] transition hover:border-[var(--sky)]">
				<span class="flex items-center gap-2"><Icon name="hub" size={13} /> E-WIN ecosystem</span>
				<span aria-hidden="true">→</span>
			</a>
		</div>
	</section>

	<section class="grid gap-4 lg:grid-cols-3">
		<div class="guru-card p-5 lg:col-span-2">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Recent activity</h2>
				<a href="/activity" class="text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">Full timeline →</a>
			</div>
			{#if !events || events.length === 0}
				<p class="py-4 text-[12px] leading-relaxed text-[var(--muted)]">No activity yet — start with any module above. Every engine run is logged here.</p>
			{:else}
				<ul class="divide-y divide-[var(--line)]">
					{#each events as e (e._id)}
						<li class="flex items-center justify-between gap-3 py-2.5 text-[11.5px]">
							<div class="flex min-w-0 items-center gap-2.5">
								<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md {e.ok ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}">
									<Icon name={moduleIcon(e.module)} size={12} />
								</span>
								<span class="truncate text-[var(--ink-soft)]">{moduleLabel(e.module)} · {e.action}</span>
							</div>
							<span class="shrink-0 text-[9.5px] tabular-nums text-[var(--muted)]">{new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="guru-card p-5">
			<h2 class="mb-3 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Your access</h2>
			{#if me}
				<dl class="space-y-2.5 text-[11.5px]">
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Roles</dt><dd class="truncate font-semibold text-[var(--ink)]">{me.roleKeys.length ? me.roleKeys.join(", ") : "Member"}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Plan</dt><dd class="font-semibold text-[var(--ink)]">{planLabel}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Permissions</dt><dd class="font-semibold text-[var(--ink)]">{me.permissions.length}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-[var(--muted)]">Conversations</dt><dd class="font-semibold text-[var(--ink)]">{me.conversationCount}</dd></div>
				</dl>
				<div class="mt-4 flex flex-wrap gap-1.5">
					<a href="/security" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[10.5px]"><Icon name="security" size={12} /> Security</a>
					<a href="/team" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[10.5px]"><Icon name="team" size={12} /> Team</a>
					{#if can(me, "admin.users.read")}<a href="/admin" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[10.5px]"><Icon name="admin" size={12} /> Admin</a>{/if}
				</div>
			{:else}
				<p class="text-[12px] text-[var(--muted)]"><a class="font-semibold text-[var(--accent)] hover:underline" href="/login">Sign in</a> to see your roles, plan and permissions.</p>
			{/if}
		</div>
	</section>

	<section class="guru-card p-5">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink)]">Harmonised modules</h2>
			<p class="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{counts ? `${counts.total} runs · ${counts.ok} succeeded` : "Ctrl K to jump anywhere"}</p>
		</div>
		<div class="flex flex-wrap gap-1.5">
			{#each NAV.filter((n) => n.href !== "/home" && (!n.authOnly || $session) && (!n.permission || can(me, n.permission))) as item (item.href)}
				<a href={item.href} class="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]">
					<Icon name={item.href} size={11} /> {item.label}
				</a>
			{/each}
		</div>
	</section>
</div>
