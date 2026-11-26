<script lang="ts">
	import { onMount } from "svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { gq, mx } from "$lib/convex";
	import { session, account } from "$lib/auth";
	import { toastOk, toastErr } from "$lib/stores";
	import { initials, type Me } from "$lib/access";

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_profile = $derived($session ? gq<any>("profiles.get", { token: $session }) : null);
	const profile = $derived(S_profile ? $S_profile : null);

	let form = $state({ displayName: "", headline: "", company: "", location: "", website: "", bio: "" });
	let saving = $state(false);
	let saved = $state(false);
	let loaded = $state(false);

	$effect(() => {
		if (loaded) return;
		const source = profile ?? me?.profile;
		if (!source && !me) return;
		form = {
			displayName: source?.displayName ?? me?.account.name ?? "",
			headline: source?.headline ?? "",
			company: source?.company ?? "",
			location: source?.location ?? "",
			website: source?.website ?? "",
			bio: source?.bio ?? ""
		};
		loaded = true;
	});

	onMount(async () => {
		if (!$session) return;
		try {
			await mx("profiles.ensureMine", { token: $session });
		} catch {
			/* non-fatal: update() creates the profile too */
		}
	});

	async function save() {
		if (saving || !$session) return;
		saving = true;
		saved = false;
		try {
			await mx("profiles.update", { token: $session, ...form });
			saved = true;
			toastOk("Profile saved.");
		} catch (error) {
			toastErr(error);
		} finally {
			saving = false;
		}
	}

	const roleNames = $derived((me?.roleKeys ?? []).map((key) => key.charAt(0).toUpperCase() + key.slice(1)));
</script>

<PageHeader title="Your profile" blurb="The identity your team sees across conversations, approvals and the audit trail." />

{#if !$session}
	<div class="guru-card p-6">
		<p class="text-sm text-slate-300">Sign in to manage your profile, roles and plan.</p>
		<a class="guru-btn guru-btn-primary mt-4" href="/login">Sign in</a>
	</div>
{:else}
	<div class="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
		<form class="guru-card p-5" onsubmit={(e) => { e.preventDefault(); save(); }}>
			<div class="flex items-center gap-4 border-b border-white/8 pb-4">
				<span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/80 to-cyan-500/60 text-lg font-bold text-white">{initials(form.displayName || "Guru AI")}</span>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-white">{form.displayName || "Your name"}</p>
					<p class="truncate text-xs text-slate-500">{me?.account.email ?? $account?.email}</p>
					<p class="mt-1 text-[11px] text-indigo-300">{roleNames.join(" · ") || "Member"}</p>
				</div>
			</div>

			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<label class="block sm:col-span-2">
					<span class="guru-label">Display name</span>
					<input class="guru-input mt-1" maxlength="80" required bind:value={form.displayName} placeholder="How your name appears" />
				</label>
				<label class="block sm:col-span-2">
					<span class="guru-label">Headline</span>
					<input class="guru-input mt-1" maxlength="120" bind:value={form.headline} placeholder="e.g. Content strategist · E WIN" />
				</label>
				<label class="block">
					<span class="guru-label">Company</span>
					<input class="guru-input mt-1" maxlength="120" bind:value={form.company} placeholder="Organisation" />
				</label>
				<label class="block">
					<span class="guru-label">Location</span>
					<input class="guru-input mt-1" maxlength="120" bind:value={form.location} placeholder="City, country" />
				</label>
				<label class="block sm:col-span-2">
					<span class="guru-label">Website</span>
					<input class="guru-input mt-1" type="url" maxlength="300" bind:value={form.website} placeholder="https://" />
					<span class="mt-1 block text-[11px] text-slate-500">Only http(s) links are stored.</span>
				</label>
				<label class="block sm:col-span-2">
					<span class="guru-label">Bio</span>
					<textarea class="guru-input mt-1 min-h-24" maxlength="600" bind:value={form.bio} placeholder="A short introduction for your team."></textarea>
					<span class="mt-1 block text-[11px] text-slate-500">{form.bio.length}/600</span>
				</label>
			</div>

			<div class="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
				<button class="guru-btn guru-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
				{#if saved}<span class="text-xs text-emerald-300">Saved</span>{/if}
			</div>
		</form>

		<div class="space-y-4">
			<div class="guru-card p-5">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Account</h2>
				<dl class="mt-3 space-y-2 text-xs">
					<div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Status</dt><dd class="text-emerald-300">{me?.account.status ?? "active"}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Provider</dt><dd class="text-slate-200">{me?.account.provider ?? $account?.provider ?? "password"}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Plan</dt><dd class="text-[var(--ink)]">{me?.account?.role === "admin" ? "Enterprise" : (me?.plan?.name ?? "Starter")}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Member since</dt><dd class="text-slate-200">{me?.account.createdAt ? new Date(me.account.createdAt).toLocaleDateString() : "—"}</dd></div>
					<div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Last sign-in</dt><dd class="text-slate-200">{me?.account.lastLoginAt ? new Date(me.account.lastLoginAt).toLocaleDateString() : "—"}</dd></div>
				</dl>
			</div>
			<div class="guru-card p-5">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Access</h2>
				<p class="mt-2 text-xs leading-relaxed text-slate-400">Roles decide what you can do; your plan decides what the workspace unlocks.</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<a href="/roles" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Roles</a>
					<a href="/subscription" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Plan</a>
					<a href="/notifications" class="guru-btn guru-btn-ghost !px-3 !py-1.5 !text-xs">Notifications</a>
				</div>
				<p class="mt-3 text-[11px] text-slate-600">Your profile is visible to administrators for approvals and support.</p>
			</div>
		</div>
	</div>
{/if}