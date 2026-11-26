<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { session } from "$lib/auth";
	import { gq } from "$lib/convex";
	import { NAV } from "$lib/nav";
	import { workspaceId } from "$lib/stores";
	import { can, type Me } from "$lib/access";

	type Kind = "engine" | "security" | "identity";
	type Item = { id: string; at: number; title: string; detail: string; kind: Kind; icon: string; ok: boolean };

	const wid = $derived($workspaceId);
	const S_events = $derived(wid ? gq<any[]>("usage.recent", { workspaceId: wid, limit: 40 }) : null);
	const events = $derived<any[]>((S_events ? $S_events : null) ?? []);
	const S_counts = $derived(wid ? gq<any>("usage.counts", { workspaceId: wid }) : null);
	const counts = $derived(S_counts ? $S_counts : null);
	const S_audit = $derived($session ? gq<any[]>("audit.mine", { token: $session }) : null);
	const auditRows = $derived<any[]>((S_audit ? $S_audit : null) ?? []);
	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);

	let filter = $state<"all" | Kind>("all");

	const labels: Record<string, string> = {
		"auth.login": "Signed in with password",
		"auth.register": "Account created",
		"auth.logout": "Signed out",
		"auth.hub_synced": "Hub identity synchronised",
		"auth.hub_provisioned": "Provisioned from E-WIN Hub",
		"identity.hub_linked": "E-WIN Hub linked",
		"identity.hub_unlinked": "E-WIN Hub disconnected",
		"security.sessions_revoked": "Other sessions ended",
		"security.session_revoked": "A session was ended",
		"profile.updated": "Profile updated"
	};

	function moduleLabel(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.label ?? m;
	}
	function moduleIcon(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.href ?? "default";
	}
	function kindOf(action: string): Kind {
		if (action.startsWith("identity") || action.includes("hub")) return "identity";
		return "security";
	}
	function detailText(detail: string | null) {
		if (!detail) return "";
		if (detail.startsWith("{")) {
			try {
				const names: Record<string, string> = { product: "Product", security: "Security", broadcast: "Broadcast", message: "Messages", emailDigest: "Email digest" };
				return Object.entries(JSON.parse(detail))
					.filter(([key]) => key !== "updatedAt")
					.map(([key, value]) => names[key] ?? key + ": " + (value === true ? "on" : value === false ? "off" : String(value)))
					.join(" · ");
			} catch {
				return detail;
			}
		}
		return detail;
	}

	const items = $derived.by<Item[]>(() => {
		const merged: Item[] = [
			...auditRows.map((row) => ({
				id: "a-" + row._id,
				at: row.at,
				title: labels[row.action] ?? row.action.replace(/[._]/g, " "),
				detail: detailText(row.detail) || row.targetType,
				kind: kindOf(row.action),
				icon: kindOf(row.action) === "identity" ? "hub" : "security",
				ok: row.outcome === "success"
			})),
			...events.map((row) => ({
				id: "u-" + row._id,
				at: row.createdAt,
				title: moduleLabel(row.module) + " · " + row.action,
				detail: (row.ok ? "Completed" : "Failed") + (row.ms ? " in " + row.ms + "ms" : "") + (row.provider ? " · " + row.provider : ""),
				kind: "engine" as Kind,
				icon: moduleIcon(row.module),
				ok: row.ok
			}))
		];
		return merged.sort((a, b) => b.at - a.at).slice(0, 60);
	});
	const filtered = $derived(filter === "all" ? items : items.filter((item) => item.kind === filter));
	const securityCount = $derived(items.filter((i) => i.kind !== "engine").length);
	const successRate = $derived(counts?.total ? Math.round((counts.ok / counts.total) * 100) : null);

	function when(at: number) {
		const diff = Date.now() - at;
		if (diff < 60_000) return "just now";
		if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
		if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
		return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
	}
	const filters = [
		{ key: "all" as const, label: "Everything" },
		{ key: "engine" as const, label: "Engine runs" },
		{ key: "security" as const, label: "Security" },
		{ key: "identity" as const, label: "Identity" }
	];
</script>

<svelte:head>
	<title>Activity · Guru AI</title>
</svelte:head>

<PageHeader eyebrow="Workspace" title="Activity" blurb="A single timeline of engine runs, security events and identity changes across your workspace.">
	{#if me && can(me, "admin.audit.read")}<a class="guru-btn guru-btn-ghost" href="/admin">Admin audit →</a>{/if}
</PageHeader>

{#if !$session}
	<div class="guru-card p-8 text-center">
		<h2 class="text-lg font-extrabold text-[var(--ink)]">Sign in to see your activity</h2>
		<a class="guru-btn guru-btn-primary mt-4" href="/login?next=/activity">Sign in</a>
	</div>
{:else}
	<div class="space-y-4">
		<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [
				{ label: "Engine runs", value: String(counts?.total ?? events.length), icon: "tools" },
				{ label: "Success rate", value: successRate === null ? "—" : successRate + "%", icon: "analytics" },
				{ label: "Security events", value: String(securityCount), icon: "security" },
				{ label: "Timeline entries", value: String(items.length), icon: "activity" }
			] as stat (stat.label)}
				<div class="guru-card px-4 py-4">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]"><Icon name={stat.icon} size={15} /></span>
					<p class="mt-3 text-[24px] font-extrabold leading-none tracking-tight text-[var(--ink)]">{stat.value}</p>
					<p class="mt-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{stat.label}</p>
				</div>
			{/each}
		</section>

		<section class="guru-card p-5">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Unified timeline</h2>
				<div class="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
					{#each filters as f (f.key)}
						<button
							class="rounded-md px-2.5 py-1 text-[10px] font-bold transition {filter === f.key ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}"
							onclick={() => (filter = f.key)}>{f.label}</button>
					{/each}
				</div>
			</div>

			{#if filtered.length === 0}
				<p class="py-6 text-center text-[12px] leading-relaxed text-[var(--muted)]">No activity in this view yet. Run an engine or update your identity to populate the timeline.</p>
			{:else}
				<ol class="relative ml-1 border-l border-[var(--line)] pl-5">
					{#each filtered as item (item.id)}
						<li class="relative pb-4 last:pb-0">
							<span class="absolute -left-[27px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] {item.ok ? 'text-[var(--green)]' : 'text-[var(--accent)]'}">
								<Icon name={item.icon} size={11} />
							</span>
							<div class="flex flex-wrap items-start justify-between gap-1">
								<p class="text-[11.5px] font-bold first-letter:uppercase text-[var(--ink)]">{item.title}</p>
								<span class="text-[9.5px] tabular-nums text-[var(--muted)]">{when(item.at)}</span>
							</div>
							<p class="mt-0.5 text-[10.5px] text-[var(--muted)]">{item.detail}</p>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
{/if}
