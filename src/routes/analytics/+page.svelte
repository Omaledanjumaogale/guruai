<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { session } from "$lib/auth";
	import { gq } from "$lib/convex";
	import { workspaceId, workspaceName } from "$lib/stores";
	import { NAV } from "$lib/nav";

	const S_data = $derived($session && $workspaceId ? gq<any>("analytics.overview", { token: $session, workspaceId: $workspaceId }) : null);
	const data = $derived(S_data ? $S_data : null);
	const maxDay = $derived(Math.max(1, ...(data?.timeline ?? []).map((d: any) => d.count)));
	const maxModule = $derived(Math.max(1, ...(data?.byModule ?? []).map((m: any) => m.count)));
	const rate = $derived(data?.successRate ?? 100);

	function moduleLabel(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.label ?? m;
	}
	function moduleIcon(m: string) {
		return NAV.find((n) => n.href.replace("/", "") === m)?.href ?? "default";
	}
	function when(at: number) {
		return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
</script>

<svelte:head>
	<title>Analytics · Guru AI</title>
</svelte:head>

<PageHeader eyebrow="Workspace" title="Analytics" blurb="Engine volume, reliability and latency for this workspace — bounded to the latest 1,200 recorded runs.">
	<a class="guru-btn guru-btn-ghost" href="/activity">Activity timeline →</a>
</PageHeader>

{#if !$session}
	<div class="guru-card p-8 text-center">
		<h2 class="text-lg font-extrabold text-[var(--ink)]">Sign in to view analytics</h2>
		<a class="guru-btn guru-btn-primary mt-4" href="/login?next=/analytics">Sign in</a>
	</div>
{:else if data && data.total === 0}
	<div class="guru-card p-10 text-center">
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]"><Icon name="analytics" size={22} /></div>
		<h2 class="mt-4 text-lg font-extrabold text-[var(--ink)]">No engine runs yet</h2>
		<p class="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]">Run a chat, image, humanizer or any other engine and this dashboard will populate automatically.</p>
		<a class="guru-btn guru-btn-primary mt-5" href="/chat">Start a chat</a>
	</div>
{:else if data === null}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		{#each [1, 2, 3, 4] as i (i)}<div class="guru-card h-[126px] animate-pulse bg-[var(--surface-2)]"></div>{/each}
	</div>
	<div class="mt-4 guru-card h-64 animate-pulse bg-[var(--surface-2)]"></div>
{:else}
	<div class="space-y-4">
		<section class="grid grid-cols-2 gap-3 xl:grid-cols-4">
			{#each [
				{ label: "Engine runs", value: data ? String(data.total) : "—", note: "last 1,200 max", icon: "tools", tone: "" },
				{ label: "Success rate", value: data ? rate + "%" : "—", note: data ? data.ok + " completed" : "", icon: "check", tone: "green" },
				{ label: "Avg latency", value: data?.avgMs ? data.avgMs + "ms" : "—", note: "measured runs", icon: "activity", tone: "sky" },
				{ label: "Active modules", value: data ? String(data.byModule.length) : "—", note: $workspaceName ?? "workspace", icon: "visuals", tone: "" }
			] as stat (stat.label)}
				<div class="guru-card px-4 py-4">
					<div class="flex items-center justify-between">
						<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] {stat.tone === 'green' ? 'text-[var(--green)]' : stat.tone === 'sky' ? 'text-[var(--sky)]' : 'text-[var(--muted)]'}"><Icon name={stat.icon} size={15} /></span>
						<span class="text-[8.5px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{stat.note}</span>
					</div>
					<p class="mt-3 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[var(--ink)]">{stat.value}</p>
					<p class="mt-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{stat.label}</p>
				</div>
			{/each}
		</section>

		<div class="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
			<section class="guru-card p-5">
				<div class="flex items-start justify-between">
					<div>
						<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Volume · last 14 days</h2>
						<p class="mt-0.5 text-[10.5px] text-[var(--muted)]">Recorded engine runs per day</p>
					</div>
					<span class="guru-chip guru-chip-green">Live</span>
				</div>
				<div class="mt-6 flex h-40 items-end gap-1.5 border-b border-[var(--line)] pb-1" role="img" aria-label="Engine runs per day for the last 14 days">
					{#each data.timeline as d (d.key)}
						<div class="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
							<span class="text-[8.5px] font-bold tabular-nums text-[var(--muted)] opacity-0 transition group-hover:opacity-100">{d.count}</span>
							<div class="w-full rounded-t-[3px] bg-gradient-to-t from-[var(--accent)] to-[#ff8a92] transition group-hover:opacity-80" style="height: {Math.max(3, Math.round((d.count / maxDay) * 100))}%"></div>
						</div>
					{/each}
				</div>
				<div class="mt-1.5 flex gap-1.5">
					{#each data.timeline as d (d.key)}
						<span class="flex-1 text-center text-[8px] font-semibold uppercase tracking-wide text-[var(--muted)]">{d.label.slice(0, 1)}</span>
					{/each}
				</div>
			</section>

			<section class="guru-card flex flex-col items-center justify-center p-5 text-center">
				<h2 class="self-start text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Reliability</h2>
				<div
					class="relative mt-5 flex h-32 w-32 items-center justify-center rounded-full"
					style="background: conic-gradient(var(--green) 0% {rate}%, var(--accent) {rate}% 100%);"
					role="img"
					aria-label="{rate}% of runs succeeded"
				>
					<div class="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-[var(--surface)]">
						<span class="text-[26px] font-extrabold leading-none tracking-tight text-[var(--ink)]">{rate}%</span>
						<span class="mt-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">success</span>
					</div>
				</div>
				<div class="mt-5 grid w-full grid-cols-2 gap-2">
					<div class="rounded-lg bg-[var(--green-soft)] px-2 py-2"><p class="text-[16px] font-extrabold text-[var(--green)]">{data.ok}</p><p class="text-[8.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Completed</p></div>
					<div class="rounded-lg bg-[var(--accent-soft)] px-2 py-2"><p class="text-[16px] font-extrabold text-[var(--accent)]">{data.failed}</p><p class="text-[8.5px] font-bold uppercase tracking-wider text-[var(--muted)]">Failed</p></div>
				</div>
			</section>
		</div>

		<div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
			<section class="guru-card p-5">
				<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Module distribution</h2>
				<p class="mt-0.5 text-[10.5px] text-[var(--muted)]">Where the workspace spends its runs</p>
				<ul class="mt-4 space-y-3">
					{#each data.byModule as m (m.module)}
						<li>
							<div class="flex items-center justify-between gap-2 text-[10.5px]">
								<span class="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--ink-soft)]"><Icon name={moduleIcon(m.module)} size={11} /><span class="truncate">{moduleLabel(m.module)}</span></span>
								<span class="shrink-0 tabular-nums text-[var(--muted)]">{m.count} · {m.avgMs}ms</span>
							</div>
							<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
								<div class="h-full rounded-full bg-[var(--sky)]" style="width: {Math.max(3, Math.round((m.count / maxModule) * 100))}%"></div>
							</div>
						</li>
					{/each}
				</ul>
			</section>

			<section class="guru-card p-5">
				<div class="flex items-center justify-between">
					<h2 class="text-[14px] font-extrabold tracking-tight text-[var(--ink)]">Recent runs</h2>
					<a class="text-[10px] font-semibold text-[var(--sky)] hover:underline" href="/activity">Full timeline →</a>
				</div>
				{#if data.recent.length === 0}
					<p class="py-4 text-[11.5px] text-[var(--muted)]">No recent runs.</p>
				{:else}
					<ul class="mt-2 divide-y divide-[var(--line)]">
						{#each data.recent as run, i (i)}
							<li class="flex items-center justify-between gap-2 py-2.5">
								<div class="flex min-w-0 items-center gap-2">
									<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md {run.ok ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}"><Icon name={moduleIcon(run.module)} size={11} /></span>
									<div class="min-w-0">
										<p class="truncate text-[10.5px] font-semibold text-[var(--ink)]">{moduleLabel(run.module)}</p>
										<p class="truncate text-[9.5px] text-[var(--muted)]">{run.action}</p>
									</div>
								</div>
								<div class="shrink-0 text-right">
									<p class="text-[9.5px] tabular-nums text-[var(--muted)]">{run.ms ? run.ms + "ms" : "—"}</p>
									<p class="text-[8.5px] text-[var(--muted)]">{when(run.createdAt)}</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>
{/if}
