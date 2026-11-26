<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import { workspaceId, workspaceName } from "$lib/stores";
	import { gq } from "$lib/convex";
	import { NAV } from "$lib/nav";
	import { session } from "$lib/auth";
	import { can, type Me } from "$lib/access";

	const wid = $derived($workspaceId);
	const S_counts = $derived(wid ? gq("usage.counts", { workspaceId: wid }) : null);
	const counts = $derived(S_counts ? $S_counts : null);
	const S_events = $derived(wid ? gq("usage.recent", { workspaceId: wid, limit: 12 }) : null);
	const events = $derived(S_events ? $S_events : null);
	const S_connectors = $derived(wid ? gq("connectors.list", { workspaceId: wid }) : null);
	const connectors = $derived(S_connectors ? $S_connectors : null);
	const S_chats = $derived(wid ? gq("chats.list", { workspaceId: wid }) : null);
	const chats = $derived(S_chats ? $S_chats : null);
	const S_agents = $derived(wid ? gq("agents.list", { workspaceId: wid }) : null);
	const agents = $derived(S_agents ? $S_agents : null);
	const S_notes = $derived(wid ? gq("notes.list", { workspaceId: wid }) : null);
	const notes = $derived(S_notes ? $S_notes : null);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_subs = $derived($session ? gq<any>("subscriptions.me", { token: $session }) : null);
	const plan = $derived(me?.plan ?? ($S_subs ? $S_subs.plan : null));

	const stats = $derived([
		{ label: "Chats", value: chats?.length ?? 0, href: "/chat", icon: "◈" },
		{ label: "Notes", value: notes?.length ?? 0, href: "/notes", icon: "▤" },
		{ label: "Agents", value: agents?.length ?? 0, href: "/agents", icon: "⚙" },
		{ label: "Connectors", value: connectors?.length ?? 0, href: "/connectors", icon: "⚿" }
	]);

	const quick = [
		{ href: "/chat", label: "Start a chat", icon: "◈", blurb: "GuruRoute picks the best model for you" },
		{ href: "/images", label: "Generate an image", icon: "▦", blurb: "Text-to-image with the DeepAI engine" },
		{ href: "/humanizer", label: "Humanize text", icon: "✎", blurb: "Rewrite AI text into natural prose" },
		{ href: "/keywords", label: "Research keywords", icon: "⌕", blurb: "Questions, prepositions, comparisons" },
		{ href: "/reverse-api", label: "Reverse an API", icon: "⟲", blurb: "HAR → typed client + key extraction" },
		{ href: "/agents", label: "Run an agent", icon: "⚙", blurb: "Multi-step AI workflows" }
	];

	function moduleLabel(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.label ?? m;
	}
</script>

<PageHeader title={`Good to see you, ${me?.profile?.displayName ?? me?.account?.name ?? $workspaceName}`} blurb="Your harmonized AI workspace — chat, create, research, convert, automate and reverse engineer, all in one place.">
	<a class="guru-btn guru-btn-primary" href="/chat">Open Chat</a>
</PageHeader>

{#if $session && me}
	<a href="/notifications" class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3 text-sm transition hover:border-indigo-400/40">
		<span class="guru-chip border-indigo-400/30 bg-indigo-400/10 text-indigo-200">{me.account.role === "admin" ? "Super admin" : me.roleKeys.join(", ") || "Member"}</span>
		<span class="text-slate-300">Plan: <strong class="font-semibold text-white">{plan?.name ?? "Starter"}</strong></span>
		{#if me.unreadNotifications > 0}<span class="text-indigo-300">{me.unreadNotifications} unread notification{me.unreadNotifications === 1 ? "" : "s"}</span>{/if}
		<span class="ml-auto text-xs text-slate-400">Open notifications →</span>
	</a>
{/if}

<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
	{#each stats as s (s.label)}
		<a href={s.href} class="guru-card guru-card-hover px-4 py-4">
			<p class="text-xs font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
			<p class="mt-1 text-2xl font-bold text-white">{s.value}</p>
			<p class="text-[11px] text-indigo-300/70">{s.href.slice(1)}</p>
		</a>
	{/each}
</section>

<section class="mt-6 grid gap-4 lg:grid-cols-3">
	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Quick actions</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each quick as q (q.href)}
				<a href={q.href} class="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition hover:border-indigo-400/40 hover:bg-white/[0.05]">
					<span class="mt-0.5 text-lg text-indigo-300" aria-hidden="true">{q.icon}</span>
					<span>
						<span class="block text-sm font-semibold text-slate-100">{q.label}</span>
						<span class="block text-xs text-slate-500">{q.blurb}</span>
					</span>
				</a>
			{/each}
		</div>
	</div>

	<div class="guru-card p-5">
		<h2 class="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-slate-400">
			Engines
			<a class="text-xs font-normal normal-case text-indigo-300 hover:underline" href="/connectors">Manage</a>
		</h2>
		{#if connectors === null}
			<p class="text-sm text-slate-500">Loading…</p>
		{:else if connectors.length === 0}
			<p class="text-sm leading-relaxed text-slate-500">
				No connectors yet. Add a key in the
				<a class="text-indigo-300 hover:underline" href="/connectors">Connector Vault</a>
				or let the <a class="text-indigo-300 hover:underline" href="/reverse-api">Reverse API Lab</a> discover keys in your own repos.
			</p>
		{:else}
			<ul class="space-y-2">
				{#each connectors as c (c._id)}
					<li class="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
						<div>
							<p class="text-sm font-medium text-slate-200">{c.provider}</p>
							<p class="text-[11px] text-slate-500">{c.label}</p>
						</div>
						<StatusDot status={c.status} />
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<section class="mt-6 grid gap-4 lg:grid-cols-3">
	<div class="guru-card p-5 lg:col-span-2">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent activity</h2>
		{#if !events || events.length === 0}
			<p class="text-sm text-slate-500">No activity yet — start with any module above. Every engine run is logged here.</p>
		{:else}
			<ul class="divide-y divide-white/8">
				{#each events as e (e._id)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<div class="flex min-w-0 items-center gap-2">
							<span class={e.ok ? "text-emerald-400" : "text-rose-400"}>{e.ok ? "✔" : "✖"}</span>
							<span class="truncate text-slate-300">{moduleLabel(e.module)} · {e.action}</span>
						</div>
						<span class="shrink-0 text-[11px] text-slate-500">{new Date(e.createdAt).toLocaleTimeString()}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<div class="guru-card p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Your access</h2>
		{#if me}
			<dl class="space-y-2 text-xs">
				<div class="flex items-center justify-between"><dt class="text-slate-500">Roles</dt><dd class="text-slate-200">{me.roleKeys.length ? me.roleKeys.join(", ") : "Member"}</dd></div>
				<div class="flex items-center justify-between"><dt class="text-slate-500">Plan</dt><dd class="text-slate-200">{plan?.name ?? "Starter"}</dd></div>
				<div class="flex items-center justify-between"><dt class="text-slate-500">Permissions</dt><dd class="text-slate-200">{me.permissions.length}</dd></div>
				<div class="flex items-center justify-between"><dt class="text-slate-500">Conversations</dt><dd class="text-slate-200">{me.conversationCount}</dd></div>
			</dl>
			<div class="mt-3 flex flex-wrap gap-1.5">
				<a href="/roles" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[11px]">Roles</a>
				<a href="/inbox" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[11px]">Messages</a>
				{#if can(me, "admin.users.read")}<a href="/admin" class="guru-btn guru-btn-ghost !px-2.5 !py-1 !text-[11px]">Admin</a>{/if}
			</div>
		{:else}
			<p class="text-sm text-slate-500"><a class="text-indigo-300 hover:underline" href="/login">Sign in</a> to see your roles, plan and permissions.</p>
		{/if}
	</div>
</section>

<section class="mt-6 guru-card p-5">
	<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Harmonized modules</h2>
	<div class="flex flex-wrap gap-1.5">
		{#each NAV.filter((n) => n.href !== "/" && n.href !== "/home") as item (item.href)}
			<a href={item.href} class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/50 hover:text-white">
				{item.icon} {item.label}
			</a>
		{/each}
	</div>
	<p class="mt-4 text-xs leading-relaxed text-slate-500">
		{counts ? `${counts.total} engine runs recorded · ${counts.ok} succeeded` : "Press Ctrl K to jump anywhere."}
	</p>
</section>