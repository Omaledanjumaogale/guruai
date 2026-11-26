<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { gq, mx } from "$lib/convex";
	import { session } from "$lib/auth";
	import { toastOk, toastErr } from "$lib/stores";
	import { can, statusTone, type Me } from "$lib/access";

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_catalogue = $derived(gq<any>("rbac.catalogue", {}));
	const catalogue = $derived(S_catalogue ? $S_catalogue : null);
	const canManage = $derived(can(me, "role.manage"));
	const S_assignments = $derived($session && canManage ? gq<any>("rbac.assignments", { token: $session, status: "all" }) : null);
	const assignments = $derived(S_assignments ? $S_assignments : null);

	let busy = $state<string>("");
	let notes = $state<Record<string, string>>({});
	let decisions = $state<Record<string, string>>({});
	let assignEmail = $state("");
	let assignRole = $state("manager");
	let assignReason = $state("");

	const permissionLabels = $derived(
		Object.fromEntries(((catalogue?.permissions ?? []) as any[]).map((p) => [p.key, p.label])) as Record<string, string>
	);

	const myAssignments = $derived(me?.roles ?? []);
	const effectiveKeys = $derived(me?.roleKeys ?? []);
	const activeKeys = $derived(new Set(myAssignments.filter((a) => a.status === "active").map((a) => a.roleKey)));
	const requestedKeys = $derived(new Set(myAssignments.filter((a) => a.status === "requested").map((a) => a.roleKey)));
	const roleNames = $derived(Object.fromEntries(((catalogue?.roles ?? []) as any[]).map((r) => [r.key, r.name])) as Record<string, string>);
	const pending = $derived((assignments?.rows ?? []).filter((a: any) => a.status === "requested"));
	const history = $derived((assignments?.rows ?? []).filter((a: any) => a.status !== "requested").slice(0, 20));

	async function requestRole(roleKey: string) {
		if (!$session || busy) return;
		busy = `request:${roleKey}`;
		try {
			const res: any = await mx("rbac.requestRole", { token: $session, roleKey, note: notes[roleKey] || undefined });
			toastOk(res?.status === "active" ? "Role activated." : "Request sent for review.");
			notes[roleKey] = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function decide(assignmentId: string, decision: string) {
		if (!$session || busy) return;
		busy = `${decision}:${assignmentId}`;
		try {
			await mx("rbac.decideRole", { token: $session, assignmentId, decision, reason: decisions[assignmentId] || undefined });
			toastOk(decision === "active" ? "Role approved." : decision === "rejected" ? "Request rejected." : "Role updated.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}

	async function assign() {
		if (!$session || busy) return;
		busy = "assign";
		try {
			await mx("rbac.assignRole", { token: $session, email: assignEmail.trim(), roleKey: assignRole, reason: assignReason || undefined });
			toastOk("Role assigned.");
			assignEmail = "";
			assignReason = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = "";
		}
	}
</script>

<PageHeader title="Roles & access" blurb="Least-privilege by default: every role is a named bundle of permissions, and elevation is reviewed." />

{#if !$session}
	<div class="guru-card p-6">
		<p class="text-sm text-slate-300">Sign in to see your roles, request elevation or review approvals.</p>
		<a class="guru-btn guru-btn-primary mt-4" href="/login">Sign in</a>
	</div>
{:else}
	<section class="grid gap-4 lg:grid-cols-3">
		<div class="guru-card p-5 lg:col-span-2">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Your assignments</h2>
			{#if !me}
				<div class="mt-4 space-y-2"><div class="guru-skeleton h-10 w-full"></div><div class="guru-skeleton h-10 w-full"></div></div>
			{:else if myAssignments.length === 0}
				{#if effectiveKeys.length}
					<ul class="mt-3 space-y-2">
						{#each effectiveKeys as key (key)}
							<li class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
								<div>
									<p class="text-sm font-medium text-slate-200">{roleNames[key] ?? key}</p>
									<p class="text-[11px] text-slate-500">Inherited from your account — no separate request needed.</p>
								</div>
								<span class="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">active</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 text-sm text-slate-400">No roles yet. Your account works as a member; request a role below to unlock more.</p>
				{/if}
			{:else}
				<ul class="mt-3 divide-y divide-white/8">
					{#each myAssignments as assignment (assignment._id)}
						<li class="flex flex-wrap items-center justify-between gap-2 py-2.5">
							<div>
								<p class="text-sm font-medium text-slate-200">{roleNames[assignment.roleKey] ?? assignment.roleKey}</p>
								<p class="text-[11px] text-slate-500">Requested {new Date(assignment.requestedAt).toLocaleDateString()}{assignment.reason ? ` · ${assignment.reason}` : ""}</p>
							</div>
							<span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {statusTone(assignment.status)}">{assignment.status}</span>
						</li>
					{/each}
				</ul>
				{#if effectiveKeys.some((key) => !activeKeys.has(key))}
					<div class="mt-2 flex flex-wrap items-center gap-1.5">
						<span class="text-[10px] uppercase tracking-wider text-slate-500">Also active:</span>
						{#each effectiveKeys.filter((key) => !activeKeys.has(key)) as key (key)}
							<span class="guru-chip">{roleNames[key] ?? key}</span>
						{/each}
					</div>
				{/if}
			{/if}
			<p class="mt-3 border-t border-white/8 pt-3 text-[11px] text-slate-500">{me?.permissions.length ?? 0} permissions active · plan <a class="text-indigo-300 hover:underline" href="/subscription">{me?.plan?.name ?? "Starter"}</a></p>
		</div>

		<div class="guru-card p-5">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Available roles</h2>
			{#if !catalogue}
				<div class="mt-4 space-y-2"><div class="guru-skeleton h-12 w-full"></div><div class="guru-skeleton h-12 w-full"></div></div>
			{:else}
				<ul class="mt-3 space-y-2">
					{#each catalogue.roles as role (role.key)}
						<li class="rounded-xl border border-white/8 bg-white/[0.02] p-3">
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="text-sm font-semibold text-slate-100">{role.name}</p>
									<p class="text-[11px] leading-relaxed text-slate-500">{role.description}</p>
								</div>
								<span class="guru-chip">{role.permissions.length} perms</span>
							</div>
							{#if role.selfSelectable}
								{#if activeKeys.has(role.key)}
									<p class="mt-2 text-[11px] font-semibold text-emerald-300">Active on your account</p>
								{:else if requestedKeys.has(role.key)}
									<p class="mt-2 text-[11px] font-semibold text-amber-300">Waiting for review</p>
								{:else}
									{#if role.requiresApproval}
										<input class="guru-input mt-2 !py-1.5 !text-xs" placeholder="Why do you need it? (optional)" maxlength="300" bind:value={notes[role.key]} />
									{/if}
									<button class="guru-btn guru-btn-ghost mt-2 !px-2.5 !py-1 !text-[11px]" onclick={() => requestRole(role.key)} disabled={busy === `request:${role.key}`}>
										{busy === `request:${role.key}` ? "Sending…" : role.requiresApproval ? "Request role" : `Enable ${role.name}`}
									</button>
								{/if}
							{:else}
								<p class="mt-2 text-[11px] text-slate-500">Assigned by an administrator.</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	{#if canManage}
		<section class="mt-6 grid gap-4 lg:grid-cols-2">
			<div class="guru-card p-5">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Approval queue</h2>
				{#if !assignments}
					<div class="mt-4 space-y-2"><div class="guru-skeleton h-12 w-full"></div></div>
				{:else if pending.length === 0}
					<p class="mt-3 text-sm text-slate-400">Nothing waiting. Every request has been reviewed.</p>
				{:else}
					<ul class="mt-3 space-y-3">
						{#each pending as row (row._id)}
							<li class="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p class="text-sm font-semibold text-slate-100">{row.name ?? row.email}</p>
										<p class="text-[11px] text-slate-500">{row.email} · {row.roleName} · {new Date(row.requestedAt).toLocaleDateString()}</p>
									</div>
								</div>
								{#if row.reason}<p class="mt-1.5 text-[11px] italic text-slate-400">“{row.reason}”</p>{/if}
								<input class="guru-input mt-2 !py-1.5 !text-xs" placeholder="Reason / note (recorded in the audit log)" maxlength="300" bind:value={decisions[row._id]} />
								<div class="mt-2 flex gap-2">
									<button class="guru-btn guru-btn-primary !px-2.5 !py-1 !text-[11px]" onclick={() => decide(row._id, "active")} disabled={busy === `active:${row._id}`}>Approve</button>
									<button class="guru-btn guru-btn-danger !px-2.5 !py-1 !text-[11px]" onclick={() => decide(row._id, "rejected")} disabled={busy === `rejected:${row._id}`}>Reject</button>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="guru-card p-5">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Assign directly</h2>
				<form class="mt-3 space-y-3" onsubmit={(e) => { e.preventDefault(); assign(); }}>
					<label class="block">
						<span class="guru-label">Member email</span>
						<input class="guru-input mt-1" type="email" required bind:value={assignEmail} placeholder="member@company.com" />
					</label>
					<label class="block">
						<span class="guru-label">Role</span>
						<select class="guru-input mt-1" bind:value={assignRole}>
							{#each (catalogue?.roles ?? []) as role (role.key)}
								<option value={role.key}>{role.name}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="guru-label">Reason</span>
						<input class="guru-input mt-1" bind:value={assignReason} maxlength="300" placeholder="Recorded in the audit trail" />
					</label>
					<button class="guru-btn guru-btn-primary" type="submit" disabled={busy === "assign"}>{busy === "assign" ? "Assigning…" : "Assign role"}</button>
				</form>
				{#if history.length}
					<h3 class="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent decisions</h3>
					<ul class="mt-2 space-y-1.5">
						{#each history as row (row._id)}
							<li class="flex items-center justify-between gap-2 text-[11px]">
								<span class="truncate text-slate-400">{row.email} · {row.roleName}</span>
								<span class="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase {statusTone(row.status)}">{row.status}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="mt-6 guru-card p-5">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Permission matrix</h2>
			<div class="mt-3 grid gap-3 sm:grid-cols-3">
				{#each catalogue.roles as role (role.key)}
					<div class="rounded-xl border border-white/8 bg-white/[0.02] p-3">
						<p class="text-sm font-semibold text-slate-100">{role.name}</p>
						<p class="text-[10px] uppercase tracking-wider text-slate-500">rank {role.rank}</p>
						<ul class="mt-2 space-y-1">
							{#each role.permissions as permission (permission)}
								<li class="text-[11px] leading-snug text-slate-400">· {permissionLabels[permission] ?? permission}</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</section>
	{/if}
{/if}