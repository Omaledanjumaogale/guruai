<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import { account, adminLogin, logout, startOAuth, httpSite } from "$lib/auth";
	import { gq } from "$lib/convex";
	import { workspaceId, toastOk, toastErr } from "$lib/stores";
	import { ax } from "$lib/convex";

	let email = $state("Omaledanjumaogale@gmail.com");
	let password = $state("");
	let busy = $state(false);

	const acc = $derived($account);
	const token = $derived(acc ? (localStorage.getItem("guru.auth.token") ?? "") : "");
	const S_overview = $derived(acc?.role === "admin" && token ? gq("auth.adminOverview", { token }) : null);
	const overview = $derived(S_overview ? $S_overview : null);

	async function login() {
		if (busy) return;
		busy = true;
		try {
			await adminLogin(email, password);
			password = "";
			toastOk("Super admin session started");
		} catch (e) {
			toastErr(e);
		} finally {
			busy = false;
		}
	}

	async function removeUser(user: { email: string; role: string }) {
		if (!confirm(`Remove ${user.email}? Their sessions end immediately.`)) return;
		try {
			await ax("auth.removeUser", { token, email: user.email });
			toastOk(`Removed ${user.email}`);
		} catch (e) {
			toastErr(e);
		}
	}

	async function sendTest() {
		try {
			const res = await ax<{ id: string; to: string }>("email.sendTestEmail", {});
			toastOk(`Test email sent to ${res.to} (Resend id ${res.id})`);
		} catch (e) {
			toastErr(e);
		}
	}
</script>

<PageHeader title="Super Admin Console" blurb="Central control of the Guru AI deployment: accounts, engines, usage and the E WIN ecosystem status." />

{#if acc?.role !== "admin"}
	<div class="grid gap-4 lg:grid-cols-2">
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Super admin sign-in</h2>
			{#if acc}
				<div class="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
					You are signed in as <strong>{acc.email}</strong> ({acc.role}). This console needs the super-admin account — signing in
					below replaces your current session.
				</div>
			{/if}
			<form class="space-y-3" onsubmit={(e) => { e.preventDefault(); login(); }}>
				<div>
					<label class="guru-label" for="email">Email</label>
					<input id="email" class="guru-input" bind:value={email} />
				</div>
				<div>
					<label class="guru-label" for="pw">Password</label>
					<input id="pw" type="password" class="guru-input" bind:value={password} />
				</div>
				<button class="guru-btn guru-btn-primary w-full" disabled={busy || !password}>
					{#if busy}<span class="guru-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white"></span> Signing in…{:else}Sign in{/if}
				</button>
			</form>
		</div>
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Single sign-on</h2>
			<div class="space-y-2">
				<button class="guru-btn guru-btn-ghost w-full justify-start" onclick={() => startOAuth("google")}>G&nbsp; Continue with Google</button>
				<button class="guru-btn guru-btn-ghost w-full justify-start" onclick={() => startOAuth("github")}>⌂ Continue with GitHub</button>
			</div>
			<p class="mt-3 text-[11px] leading-relaxed text-slate-500">
				OAuth runs through the Convex HTTP actions at <code class="rounded bg-ink-800 px-1">{httpSite || "backend"}</code>. The account holding the super-admin email is promoted to admin automatically.
			</p>
			{#if acc}
				<a class="mt-3 inline-block text-xs text-indigo-300 hover:underline" href="/login">Go to your workspace account →</a>
			{/if}
		</div>
	</div>
{:else}
	<section class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="guru-card flex items-center gap-3 px-4 py-3">
			<div class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-bold text-indigo-200">{(acc.name ?? acc.email).slice(0, 1).toUpperCase()}</div>
			<div>
				<p class="text-sm font-semibold text-white">{acc.name ?? acc.email}</p>
				<p class="text-xs text-slate-500">{acc.email} · {acc.role} · via {acc.provider}</p>
			</div>
		</div>
		<div class="flex gap-2">
			<button class="guru-btn guru-btn-primary" onclick={sendTest}>✉ Send test email (Resend)</button>
			<button class="guru-btn guru-btn-ghost" onclick={() => logout()}>Sign out</button>
		</div>
	</section>

	<div class="grid gap-4 lg:grid-cols-3">
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Deployment health</h2>
			<ul class="space-y-2 text-sm">
				<li class="flex justify-between"><span class="text-slate-400">Backend</span><span class="text-emerald-300">Convex · live</span></li>
				<li class="flex justify-between"><span class="text-slate-400">LLM engine</span><span class="text-emerald-300">Agnes AI · OpenAI-compatible</span></li>
				<li class="flex justify-between"><span class="text-slate-400">Email engine</span><span class="text-emerald-300">Resend</span></li>
				<li class="flex justify-between"><span class="text-slate-400">Frontend</span><span class="text-emerald-300">Cloudflare Pages</span></li>
				<li class="flex justify-between"><span class="text-slate-400">Workspaces</span><span class="text-slate-200">{overview?.workspaceCount ?? "…"}</span></li>
			</ul>
		</div>
		<div class="guru-card p-5 lg:col-span-2">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Accounts</h2>
			{#if overview}
				<table class="w-full text-left text-sm">
					<thead class="text-xs uppercase text-slate-500"><tr><th class="pb-1">Email</th><th class="pb-1">Name</th><th class="pb-1">Role</th><th class="pb-1">Provider</th><th class="pb-1">Last login</th><th class="pb-1"></th></tr></thead>
					<tbody>
						{#each overview.users as u (u.email + u.provider)}
							<tr class="border-t border-indigo-500/10">
								<td class="py-1.5 text-slate-200">{u.email}</td>
								<td class="py-1.5 text-slate-400">{u.name ?? "—"}</td>
								<td class="py-1.5"><span class="rounded-full px-2 py-0.5 text-[10px] uppercase {u.role === 'admin' ? 'bg-amber-400/15 text-amber-300' : 'bg-indigo-500/15 text-indigo-300'}">{u.role}</span></td>
								<td class="py-1.5 text-slate-400">{u.provider}</td>
								<td class="py-1.5 text-slate-500">{new Date(u.lastLoginAt).toLocaleString()}</td>
								<td class="py-1.5 text-right">
									{#if u.role === 'admin'}
										<span class="text-[10px] uppercase text-slate-600">protected</span>
									{:else}
										<button class="text-[11px] text-slate-500 transition hover:text-rose-300" onclick={() => removeUser(u)}>Remove</button>
									{/if}
								</td>
							</tr>
						{:else}
							<tr><td class="py-2 text-slate-500" colspan="6">No accounts yet — sign in to create the first one.</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="text-sm text-slate-500">Loading…</p>
			{/if}
		</div>
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Connectors</h2>
			{#if overview}
				<ul class="space-y-1.5">
					{#each overview.connectors as c (c.provider + c.origin)}
						<li class="flex items-center justify-between text-sm"><span class="text-slate-300">{c.provider}</span><StatusDot status={c.status} /></li>
					{:else}
						<li class="text-slate-500">No connectors in the vault yet.</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="guru-card p-5">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">E WIN ecosystem</h2>
			<p class="text-sm leading-relaxed text-slate-300">Guru AI is registered in the E WIN Project Ecosystem as the harmonized AI workspace app.</p>
			<a class="mt-2 inline-block text-xs text-indigo-300 hover:underline" href="https://github.com/Omaledanjumaogale/E_WIN_Project_Ecosystem" target="_blank" rel="noreferrer">github.com/Omaledanjumaogale/E_WIN_Project_Ecosystem ↗</a>
		</div>
	</div>
{/if}