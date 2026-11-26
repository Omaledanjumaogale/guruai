<script lang="ts">
	import { onMount } from "svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import BrandBanner from "$lib/components/BrandBanner.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import { account, adminLogin, logout, startOAuth, httpSite } from "$lib/auth";
	import { gq, ax, mx } from "$lib/convex";
	import { toastOk, toastErr } from "$lib/stores";
	import { can, statusTone, type Me } from "$lib/access";

	const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
	let tab = $state(params.get("tab") ?? "overview");
	let conversationId = $state(params.get("conversation") ?? "");
	let email = $state("Omaledanjumaogale@gmail.com");
	let password = $state("");
	let busy = $state("");

	const acc = $derived($account);
	const token = $derived(acc ? (localStorage.getItem("guru.auth.token") ?? "") : "");
	const S_me = $derived(token ? gq<Me>("rbac.me", { token }) : null);
	const me = $derived(S_me ? $S_me : null);
	const isAdmin = $derived(Boolean(token) && (acc?.role === "admin" || can(me, "admin.users.read")));

	const S_overview = $derived(token && isAdmin ? gq<any>("admin.overview", { token }) : null);
	const overview = $derived(S_overview ? $S_overview : null);
	let search = $state("");
	const S_accounts = $derived(token && isAdmin && tab === "accounts" ? gq<any[]>("admin.accounts", { token, search: search || undefined }) : null);
	const accounts = $derived(S_accounts ? $S_accounts : null);
	const S_catalogue = $derived(token && isAdmin ? gq<any>("rbac.catalogue", {}) : null);
	const catalogue = $derived(S_catalogue ? $S_catalogue : null);
	const S_assignments = $derived(token && can(me, "role.manage") ? gq<any>("rbac.assignments", { token, status: "all" }) : null);
	const assignments = $derived(S_assignments ? $S_assignments : null);
	const S_broadcasts = $derived(token && can(me, "admin.broadcasts.read") ? gq<any[]>("notifications.broadcasts", { token }) : null);
	const broadcasts = $derived(S_broadcasts ? $S_broadcasts : null);
	const S_inbox = $derived(token && can(me, "messages.manage") ? gq<any[]>("messaging.inbox", { token }) : null);
	const inbox = $derived(S_inbox ? $S_inbox : null);
	const S_thread = $derived(token && conversationId ? gq<any>("messaging.thread", { token, conversationId }) : null);
	const thread = $derived(S_thread ? $S_thread : null);
	const S_audit = $derived(token && can(me, "admin.audit.read") ? gq<any>("audit.list", { token, limit: 80 }) : null);
	const audit = $derived(S_audit ? $S_audit : null);
	const S_legacy = $derived(token && isAdmin && tab === "deployment" ? gq<any>("auth.adminOverview", { token }) : null);
	const legacy = $derived(S_legacy ? $S_legacy : null);

	let buildInfo = $state<any>(null);
	let reply = $state("");
	let broadcast = $state({ title: "", body: "", audience: "members" });
	let decisionNotes = $state<Record<string, string>>({});
	let assignEmail = $state("");
	let assignRoleKey = $state("manager");
	let assignReason = $state("");

	const TABS = [
		{ key: "overview", label: "Overview", permission: "admin.users.read" },
		{ key: "accounts", label: "Accounts", permission: "admin.users.read" },
		{ key: "roles", label: "Roles", permission: "admin.roles.read" },
		{ key: "broadcasts", label: "Broadcasts", permission: "admin.broadcasts.read" },
		{ key: "messages", label: "Messages", permission: "messages.manage" },
		{ key: "audit", label: "Audit", permission: "admin.audit.read" },
		{ key: "deployment", label: "Deployment", permission: "admin.users.read" }
	] as const;
	const visibleTabs = $derived(TABS.filter((t) => can(me, t.permission)));
	const roleNames = $derived(Object.fromEntries(((catalogue?.roles ?? []) as any[]).map((r) => [r.key, r.name])) as Record<string, string>);
	const pendingRoles = $derived((assignments?.rows ?? []).filter((r: any) => r.status === "requested"));
	const pendingBroadcasts = $derived((broadcasts ?? []).filter((b) => b.status === "pending_review"));
	const audienceLabels: Record<string, string> = { everyone: "Everyone", members: "Members", admins: "Admins" };

	onMount(async () => {
		try {
			const res = await fetch("/build-info.json", { cache: "no-store" });
			if (res.ok) buildInfo = await res.json();
		} catch {
			/* offline shell */
		}
	});

	function selectTab(key: string) {
		tab = key;
		try {
			const url = new URL(window.location.href);
			url.searchParams.set("tab", key);
			window.history.replaceState(null, "", url);
		} catch {
			/* non-fatal */
		}
	}

	async function login() {
		if (busy || !password) return;
		busy = "login";
		try {
			await adminLogin(email, password);
			password = "";
			toastOk("Super admin session started.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function sendTest() {
		busy = "test";
		try {
			const res = await ax<{ id: string; to: string }>("email.sendTestEmail", {});
			toastOk(`Test email sent to ${res.to}.`);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function decideRole(row: any, decision: string) {
		if (busy) return;
		busy = `${decision}:${row._id}`;
		try {
			await mx("rbac.decideRole", { token, assignmentId: row._id, decision, reason: decisionNotes[row._id] || undefined });
			toastOk(`Request ${decision === "active" ? "approved" : "rejected"}.`);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function assignRole() {
		if (busy) return;
		busy = "assign";
		try {
			await mx("rbac.assignRole", { token, email: assignEmail.trim(), roleKey: assignRoleKey, reason: assignReason || undefined });
			toastOk(`Assigned ${roleNames[assignRoleKey] ?? assignRoleKey}.`);
			assignEmail = "";
			assignReason = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function setStatus(member: any, status: string) {
		if (busy) return;
		busy = `status:${member.email}`;
		try {
			await mx("rbac.setUserStatus", { token, email: member.email, status });
			toastOk(`${member.email} is now ${status}.`);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function removeUser(member: any) {
		if (!confirm(`Remove ${member.email}? Their sessions end immediately. This cannot be undone.`)) return;
		busy = `remove:${member.email}`;
		try {
			await ax("auth.removeUser", { token, email: member.email });
			toastOk(`Removed ${member.email}.`);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function draftBroadcast() {
		if (busy) return;
		busy = "broadcast";
		try {
			await mx("notifications.createBroadcast", { token, ...broadcast });
			toastOk("Announcement drafted — it needs a second reviewer.");
			broadcast = { title: "", body: "", audience: "members" };
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function reviewBroadcast(row: any, decision: string) {
		if (busy) return;
		busy = `${decision}:${row._id}`;
		try {
			const res: any = await mx("notifications.reviewBroadcast", { token, id: row._id, decision, reason: decisionNotes[row._id] || undefined });
			toastOk(decision === "approve" ? `Delivered to ${res.delivered ?? 0} member(s).` : "Announcement rejected.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function openConversation(id: string) {
		conversationId = id;
		try {
			await mx("messaging.join", { token, conversationId: id });
			await mx("messaging.markRead", { token, conversationId: id });
		} catch {
			/* already a participant */
		}
	}

	async function sendReply() {
		if (busy || !conversationId || !reply.trim()) return;
		busy = "reply";
		try {
			await mx("messaging.send", { token, conversationId, body: reply });
			reply = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}
</script>

<PageHeader title="Super Admin Console" blurb="Accounts, roles, announcements, conversations and the audit trail for this deployment.">
	{#if isAdmin}<span class="guru-chip border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Live · {overview?.counts.accounts ?? "…"} accounts</span>{/if}
</PageHeader>

{#if isAdmin}<BrandBanner name="admin" />{/if}

{#if !isAdmin}
	<div class="grid gap-4 lg:grid-cols-2">
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Super admin sign-in</h2>
			{#if acc}
				<div class="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
					Signed in as <strong>{acc.email}</strong> ({acc.role}). This console needs the super-admin account — signing in below replaces this session.
				</div>
			{/if}
			<form class="space-y-3" onsubmit={(e) => { e.preventDefault(); login(); }}>
				<label class="block"><span class="guru-label">Email</span><input class="guru-input mt-1" type="email" autocomplete="username" bind:value={email} /></label>
				<label class="block"><span class="guru-label">Password</span><input class="guru-input mt-1" type="password" autocomplete="current-password" bind:value={password} /></label>
				<button class="guru-btn guru-btn-primary w-full" disabled={busy === "login" || !password}>{busy === "login" ? "Signing in…" : "Sign in"}</button>
			</form>
		</div>
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Single sign-on</h2>
			<div class="space-y-2">
				<button class="guru-btn guru-btn-ghost w-full justify-start" onclick={() => startOAuth("google")}>G&nbsp; Continue with Google</button>
				<button class="guru-btn guru-btn-ghost w-full justify-start" onclick={() => startOAuth("github")}>⌂ Continue with GitHub</button>
			</div>
			<p class="mt-3 text-[11px] leading-relaxed text-slate-500">OAuth runs through <code class="rounded bg-ink-800 px-1">{httpSite || "the backend"}</code>. The configured super-admin email is promoted automatically.</p>
			<a class="mt-3 inline-block text-xs text-indigo-300 hover:underline" href="/login">Use another account →</a>
		</div>
	</div>
{:else}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="guru-card flex items-center gap-3 px-4 py-3">
			<span class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-bold text-indigo-200">{(acc?.name ?? acc?.email ?? "A").slice(0, 1).toUpperCase()}</span>
			<div><p class="text-sm font-semibold text-white">{acc?.name ?? acc?.email}</p><p class="text-xs text-slate-500">{acc?.email} · {me?.roleKeys.join(" · ") || acc?.role}</p></div>
		</div>
		<div class="flex flex-wrap gap-2"><button class="guru-btn guru-btn-ghost" onclick={sendTest} disabled={busy === "test"}>✉ Test email</button><button class="guru-btn guru-btn-ghost" onclick={() => logout()}>Sign out</button></div>
	</div>

	<nav class="mb-4 flex gap-1 overflow-x-auto border-b border-white/8 pb-2" aria-label="Admin sections">
		{#each visibleTabs as item (item.key)}
			<button role="tab" aria-selected={tab === item.key} class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition {tab === item.key ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}" onclick={() => selectTab(item.key)}>{item.label}</button>
		{/each}
	</nav>
	{#if tab === "overview"}
		<section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each [{ label: "Accounts", value: overview?.counts.accounts, hint: `${overview?.counts.active ?? 0} active` }, { label: "Pending roles", value: overview?.counts.pendingRoles, hint: "awaiting review" }, { label: "Open conversations", value: overview?.counts.openConversations, hint: "support threads" }, { label: "Announcements", value: overview?.counts.pendingBroadcasts, hint: "pending review" }] as card (card.label)}
				<div class="guru-card p-4"><p class="text-[11px] uppercase tracking-wider text-slate-500">{card.label}</p><p class="mt-1 text-2xl font-bold text-white">{card.value ?? "…"}</p><p class="text-[11px] text-slate-500">{card.hint}</p></div>
			{/each}
		</section>

		<div class="mt-4 grid gap-4 lg:grid-cols-2">
			<div class="guru-card p-5">
				<div class="flex items-center justify-between"><h2 class="text-sm font-semibold text-white">Role requests</h2><button class="text-[11px] text-indigo-300 hover:underline" onclick={() => selectTab("roles")}>Review →</button></div>
				{#if !overview}<div class="guru-skeleton mt-3 h-16 w-full"></div>
				{:else if overview.pendingRoles.length === 0}<p class="mt-3 text-sm text-slate-400">Nothing waiting.</p>
				{:else}<ul class="mt-3 space-y-2">{#each overview.pendingRoles as row (row._id)}<li class="flex items-center justify-between gap-2 text-xs"><span class="truncate text-slate-300">{row.email} · {row.roleKey}</span><span class="text-slate-600">{new Date(row.requestedAt).toLocaleDateString()}</span></li>{/each}</ul>{/if}
			</div>
			<div class="guru-card p-5">
				<div class="flex items-center justify-between"><h2 class="text-sm font-semibold text-white">Recent audit</h2><button class="text-[11px] text-indigo-300 hover:underline" onclick={() => selectTab("audit")}>Open log →</button></div>
				{#if !overview}<div class="guru-skeleton mt-3 h-16 w-full"></div>
				{:else if overview.audit.length === 0}<p class="mt-3 text-sm text-slate-400">No events yet.</p>
				{:else}<ul class="mt-3 space-y-2">{#each overview.audit as row (row._id)}<li class="flex items-start justify-between gap-2 text-xs"><span class="min-w-0"><span class="block truncate text-slate-300">{row.action}</span><span class="block truncate text-[11px] text-slate-500">{row.actorEmail} · {row.targetType}</span></span><span class="shrink-0 text-[10px] text-slate-600">{new Date(row.at).toLocaleTimeString()}</span></li>{/each}</ul>{/if}
			</div>
			<div class="guru-card p-5 lg:col-span-2">
				<h2 class="text-sm font-semibold text-white">Newest accounts</h2>
				{#if !overview}<div class="guru-skeleton mt-3 h-16 w-full"></div>
				{:else}<ul class="mt-3 divide-y divide-white/8">{#each overview.recentUsers as user (user.email)}<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span class="text-slate-200">{user.email}</span><span class="text-slate-500">{user.role} · {user.provider} · {new Date(user.lastLoginAt).toLocaleDateString()}</span></li>{/each}</ul>{/if}
			</div>
		</div>
	{/if}

	{#if tab === "accounts"}
		<section class="guru-card p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-sm font-semibold text-white">Accounts</h2>
				<input class="guru-input !w-64 !py-1.5 !text-xs" placeholder="Search email or name…" bind:value={search} />
			</div>
			{#if !accounts}<div class="mt-3 space-y-2"><div class="guru-skeleton h-10 w-full"></div><div class="guru-skeleton h-10 w-full"></div></div>
			{:else if accounts.length === 0}<p class="mt-3 text-sm text-slate-400">No accounts match that search.</p>
			{:else}
				<div class="mt-3 overflow-x-auto"><table class="w-full min-w-[720px] text-left text-xs"><thead class="text-[10px] uppercase tracking-wider text-slate-500"><tr><th class="pb-2">Member</th><th class="pb-2">Roles</th><th class="pb-2">Provider</th><th class="pb-2">Status</th><th class="pb-2">Last sign-in</th><th class="pb-2 text-right">Actions</th></tr></thead>
					<tbody>{#each accounts as member (member.email)}<tr class="border-t border-white/8"><td class="py-2"><p class="text-slate-200">{member.email}</p><p class="text-[10px] text-slate-500">{member.name ?? "—"}{member.headline ? ` · ${member.headline}` : ""}</p></td><td class="py-2"><div class="flex flex-wrap gap-1">{#each (member.roles.length ? member.roles : [{ roleKey: member.role, status: "active" }]) as r (r.roleKey)}<span class="rounded-full border px-1.5 py-0.5 text-[9px] uppercase {statusTone(r.status)}">{r.roleKey}</span>{/each}</div></td><td class="py-2 text-slate-400">{member.provider}</td><td class="py-2"><span class="rounded-full border px-1.5 py-0.5 text-[9px] uppercase {member.status === 'suspended' ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'}">{member.status}</span></td><td class="py-2 text-slate-500">{new Date(member.lastLoginAt).toLocaleDateString()}</td><td class="py-2 text-right">
					{#if member.email === "Omaledanjumaogale@gmail.com"}<span class="text-[10px] uppercase text-slate-600">protected</span>{:else}<div class="flex justify-end gap-2"><button class="text-[11px] text-slate-400 hover:text-white" onclick={() => setStatus(member, member.status === "suspended" ? "active" : "suspended")} disabled={busy === `status:${member.email}`}>{member.status === "suspended" ? "Activate" : "Suspend"}</button><button class="text-[11px] text-slate-500 hover:text-rose-300" onclick={() => removeUser(member)} disabled={busy === `remove:${member.email}`}>Remove</button></div>{/if}
					</td></tr>{/each}</tbody>
				</table></div>
			{/if}
		</section>
	{/if}

	{#if tab === "roles"}
		<div class="grid gap-4 lg:grid-cols-2">
			<section class="guru-card p-4">
				<h2 class="text-sm font-semibold text-white">Requests</h2>
				{#if !assignments}<div class="guru-skeleton mt-3 h-16 w-full"></div>
				{:else if pendingRoles.length === 0}<p class="mt-3 text-sm text-slate-400">No pending requests.</p>
				{:else}<ul class="mt-3 space-y-3">{#each pendingRoles as row (row._id)}<li class="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3"><p class="text-xs font-semibold text-slate-100">{row.email}</p><p class="text-[11px] text-slate-500">{row.roleName} · {new Date(row.requestedAt).toLocaleDateString()}</p>{#if row.reason}<p class="mt-1 text-[11px] italic text-slate-400">“{row.reason}”</p>{/if}<input class="guru-input mt-2 !py-1.5 !text-xs" placeholder="Decision note (audit)" bind:value={decisionNotes[row._id]} /><div class="mt-2 flex gap-2"><button class="guru-btn guru-btn-primary !px-2.5 !py-1 !text-[11px]" onclick={() => decideRole(row, "active")}>Approve</button><button class="guru-btn guru-btn-danger !px-2.5 !py-1 !text-[11px]" onclick={() => decideRole(row, "rejected")}>Reject</button></div></li>{/each}</ul>{/if}
			</section>
			<section class="guru-card p-4">
				<h2 class="text-sm font-semibold text-white">Assign a role</h2>
				<form class="mt-3 space-y-2" onsubmit={(e) => { e.preventDefault(); assignRole(); }}><input class="guru-input" type="email" required placeholder="member@company.com" bind:value={assignEmail} /><select class="guru-input" bind:value={assignRoleKey}>{#each (catalogue?.roles ?? []) as role (role.key)}<option value={role.key}>{role.name}</option>{/each}</select><input class="guru-input" placeholder="Reason (audit)" bind:value={assignReason} /><button class="guru-btn guru-btn-primary w-full" type="submit" disabled={busy === "assign"}>Assign</button></form>
				<h3 class="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent decisions</h3>
				<ul class="mt-2 space-y-1">{#each (assignments?.rows ?? []).filter((r: any) => r.status !== "requested").slice(0, 8) as row (row._id)}<li class="flex items-center justify-between gap-2 text-[11px] text-slate-400"><span class="truncate">{row.email} · {row.roleKey}</span><span class="shrink-0 uppercase text-slate-600">{row.status}</span></li>{/each}</ul>
			</section>
		</div>
	{/if}

	{#if tab === "broadcasts"}
		<div class="grid gap-4 lg:grid-cols-[1fr_360px]">
			<section class="guru-card p-4">
				<h2 class="text-sm font-semibold text-white">Announcement queue</h2>
				{#if !broadcasts}<div class="guru-skeleton mt-3 h-20 w-full"></div>
				{:else if broadcasts.length === 0}<p class="mt-3 text-sm text-slate-400">No announcements yet.</p>
				{:else}<ul class="mt-3 space-y-2">{#each broadcasts as row (row._id)}<li class="rounded-lg border border-white/8 p-3"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-medium text-slate-100">{row.title}</p><span class="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider {row.status === 'sent' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : row.status === 'rejected' ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}">{row.status}</span></div><p class="mt-1 text-xs leading-relaxed text-slate-400">{row.body}</p><p class="mt-1 text-[10px] text-slate-600">{audienceLabels[row.audience] ?? row.audience} · by {row.createdByEmail} · {new Date(row.createdAt).toLocaleDateString()}{row.recipientCount ? ` · ${row.recipientCount} delivered` : ""}</p>{#if row.status === "pending_review"}<input class="guru-input mt-2 !py-1.5 !text-xs" placeholder="Review note" bind:value={decisionNotes[row._id]} /><div class="mt-2 flex gap-2"><button class="guru-btn guru-btn-primary !px-2.5 !py-1 !text-[11px]" onclick={() => reviewBroadcast(row, "approve")} disabled={busy === `approve:${row._id}`}>Approve &amp; send</button><button class="guru-btn guru-btn-danger !px-2.5 !py-1 !text-[11px]" onclick={() => reviewBroadcast(row, "reject")} disabled={busy === `reject:${row._id}`}>Reject</button></div>{/if}</li>{/each}</ul>{/if}
			</section>
			{#if can(me, "admin.broadcasts.create")}<form class="guru-card h-fit p-4" onsubmit={(e) => { e.preventDefault(); draftBroadcast(); }}><h2 class="text-sm font-semibold text-white">Draft an announcement</h2><p class="mt-1 text-[11px] text-slate-500">A second administrator must approve it before delivery.</p><input class="guru-input mt-3" required maxlength="120" placeholder="Title" bind:value={broadcast.title} /><textarea class="guru-input mt-2 min-h-24" required maxlength="2000" placeholder="What changed?" bind:value={broadcast.body}></textarea><select class="guru-input mt-2" bind:value={broadcast.audience}><option value="members">Members</option><option value="everyone">Everyone</option><option value="admins">Admins</option><option value="plan:pro">Pro plan</option><option value="plan:enterprise">Enterprise plan</option></select><button class="guru-btn guru-btn-primary mt-3 w-full" type="submit" disabled={busy === "broadcast"}>Send for review</button></form>{/if}
		</div>
	{/if}

	{#if tab === "messages"}
		<div class="grid gap-4 lg:grid-cols-[300px_1fr]">
			<aside class="guru-card max-h-[68vh] overflow-y-auto p-3">
				<h2 class="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Support inbox</h2>
				{#if !inbox}<div class="mt-2 space-y-2"><div class="guru-skeleton h-12 w-full"></div><div class="guru-skeleton h-12 w-full"></div></div>
				{:else if inbox.length === 0}<p class="px-1 py-6 text-sm text-slate-500">No member conversations.</p>
				{:else}<ul class="mt-2 space-y-1">{#each inbox as c (c._id)}<li><button class="w-full rounded-lg px-3 py-2 text-left transition {conversationId === c._id ? 'bg-indigo-500/15' : 'hover:bg-white/5'}" onclick={() => openConversation(c._id)}><span class="block truncate text-xs font-medium text-slate-200">{c.subject}</span><span class="block truncate text-[10px] text-slate-500">{c.email} · {c.messageCount} msg</span></button></li>{/each}</ul>{/if}
			</aside>
			<section class="guru-card flex min-h-[50vh] flex-col p-4">
				{#if !conversationId}<p class="m-auto text-sm text-slate-500">Select a conversation to read and reply.</p>
				{:else if !thread}<div class="guru-skeleton h-24 w-full"></div>
				{:else}<header class="border-b border-white/8 pb-2"><h2 class="text-sm font-semibold text-white">{thread.conversation.subject}</h2><p class="text-[11px] text-slate-500">{thread.conversation.status} · opened {new Date(thread.conversation.createdAt).toLocaleDateString()}</p></header><div class="mt-3 flex-1 space-y-2 overflow-y-auto">{#each thread.messages as message (message._id)}<div class="flex {message.senderId === thread.meId ? 'justify-end' : 'justify-start'}"><div class="max-w-[85%] rounded-xl px-3 py-2 text-sm {message.senderId === thread.meId ? 'bg-indigo-500/20 text-indigo-50' : 'bg-white/[0.04] text-slate-200'}"><p class="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{message.senderLabel}</p><p class="whitespace-pre-wrap leading-relaxed">{message.body}</p></div></div>{/each}</div>{#if thread.conversation.status !== "closed"}<form class="mt-3 flex items-end gap-2 border-t border-white/8 pt-3" onsubmit={(e) => { e.preventDefault(); sendReply(); }}><textarea class="guru-input min-h-11 flex-1 resize-none" rows="2" bind:value={reply} placeholder="Reply as staff…"></textarea><button class="guru-btn guru-btn-primary" type="submit" disabled={busy === "reply" || !reply.trim()}>Send</button></form>{/if}{/if}
			</section>
		</div>
	{/if}

	{#if tab === "audit"}
		<section class="guru-card p-4">
			<h2 class="text-sm font-semibold text-white">Audit trail</h2><p class="mt-1 text-xs text-slate-500">Append-only events, newest first. Bounded to the most recent 80 rows.</p>
			{#if !audit}<div class="guru-skeleton mt-3 h-24 w-full"></div>
			{:else}<div class="mt-3 overflow-x-auto"><table class="w-full min-w-[640px] text-left text-xs"><thead class="text-[10px] uppercase tracking-wider text-slate-500"><tr><th class="pb-2">When</th><th class="pb-2">Actor</th><th class="pb-2">Action</th><th class="pb-2">Target</th><th class="pb-2">Outcome</th></tr></thead><tbody>{#each audit.rows as row (row._id)}<tr class="border-t border-white/8"><td class="py-1.5 text-slate-500">{new Date(row.at).toLocaleString()}</td><td class="py-1.5 text-slate-300">{row.actorEmail}</td><td class="py-1.5 text-slate-200">{row.action}</td><td class="py-1.5 text-slate-400">{row.targetType} · {row.targetId}</td><td class="py-1.5"><span class="rounded-full border px-1.5 py-0.5 text-[9px] uppercase {row.outcome === 'success' ? 'border-emerald-400/25 text-emerald-300' : row.outcome === 'denied' ? 'border-amber-400/25 text-amber-300' : 'border-rose-400/25 text-rose-300'}">{row.outcome}</span></td></tr>{/each}</tbody></table></div>{/if}
		</section>
	{/if}

	{#if tab === "deployment"}
		<div class="grid gap-4 lg:grid-cols-3">
			<div class="guru-card p-5"><h2 class="text-sm font-semibold text-white">Build</h2>{#if buildInfo}<dl class="mt-2 space-y-1 text-xs"><div class="flex justify-between gap-2"><dt class="text-slate-500">Version</dt><dd class="text-slate-200">{buildInfo.version}</dd></div><div class="flex justify-between gap-2"><dt class="text-slate-500">Commit</dt><dd class="truncate font-mono text-[10px] text-slate-300">{buildInfo.commitSha?.slice(0, 12)}</dd></div><div class="flex justify-between gap-2"><dt class="text-slate-500">Branch</dt><dd class="text-slate-300">{buildInfo.branch}</dd></div><div class="flex justify-between gap-2"><dt class="text-slate-500">Built</dt><dd class="text-slate-300">{buildInfo.builtAt ? new Date(buildInfo.builtAt).toLocaleString() : "—"}</dd></div></dl>{:else}<p class="mt-2 text-xs text-slate-500">build-info.json unavailable.</p>{/if}</div>
			<div class="guru-card p-5"><h2 class="text-sm font-semibold text-white">Engines</h2><ul class="mt-2 space-y-1.5 text-xs"><li class="flex justify-between"><span class="text-slate-400">Backend</span><span class="text-emerald-300">Convex live</span></li><li class="flex justify-between"><span class="text-slate-400">Frontend</span><span class="text-emerald-300">Cloudflare Pages</span></li><li class="flex justify-between"><span class="text-slate-400">Workspaces</span><span class="text-slate-200">{legacy?.workspaceCount ?? "…"}</span></li></ul>{#if legacy?.connectors?.length}<ul class="mt-3 space-y-1 border-t border-white/8 pt-2">{#each legacy.connectors.slice(0, 6) as connector (connector.provider + connector.origin)}<li class="flex items-center justify-between text-xs"><span class="text-slate-300">{connector.provider}</span><StatusDot status={connector.status} /></li>{/each}</ul>{/if}</div>
			<div class="guru-card p-5"><h2 class="text-sm font-semibold text-white">Operations</h2><div class="mt-2 space-y-2 text-xs text-slate-400"><a class="block text-indigo-300 hover:underline" href="/roles">Role catalogue →</a><a class="block text-indigo-300 hover:underline" href="/subscription">Plan distribution →</a><a class="block text-indigo-300 hover:underline" href="/notifications">Notification health →</a><a class="block text-indigo-300 hover:underline" href="https://github.com/Omaledanjumaogale/guru-ai" target="_blank" rel="noreferrer">Repository ↗</a><a class="block text-indigo-300 hover:underline" href="https://github.com/Omaledanjumaogale/E_WIN_Project_Ecosystem" target="_blank" rel="noreferrer">E WIN ecosystem ↗</a></div><p class="mt-3 border-t border-white/8 pt-2 text-[11px] text-slate-600">Managed on Cloudflare Pages and Convex. Static shells are served without invoking Workers.</p></div>
		</div>
	{/if}
{/if}