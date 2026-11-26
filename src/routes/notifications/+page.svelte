<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { gq, mx } from "$lib/convex";
	import { session } from "$lib/auth";
	import { toastOk, toastErr } from "$lib/stores";

	const S_feed = $derived($session ? gq<any>("notifications.list", { token: $session }) : null);
	const feed = $derived(S_feed ? $S_feed : null);
	const S_prefs = $derived($session ? gq<any>("notifications.prefs", { token: $session }) : null);
	const prefs = $derived(S_prefs ? $S_prefs : null);

	let filter = $state<"all" | "unread" | "announcements">("all");
	let busy = $state(false);
	let form = $state({ product: true, security: true, broadcast: true, message: true, emailDigest: false });
	let loaded = $state(false);

	$effect(() => {
		if (loaded || !prefs) return;
		form = {
			product: prefs.product,
			security: prefs.security,
			broadcast: prefs.broadcast,
			message: prefs.message,
			emailDigest: prefs.emailDigest
		};
		loaded = true;
	});

	const rows = $derived((feed?.rows ?? []).filter((n: any) => {
		if (filter === "unread") return !n.readAt;
		if (filter === "announcements") return n.kind === "broadcast";
		return true;
	}));

	const icon: Record<string, string> = { security: "⚿", broadcast: "◔", message: "✉", subscription: "◆", product: "✦" };

	async function markRead(id: string) {
		if (!$session) return;
		try {
			await mx("notifications.markRead", { token: $session, id });
		} catch {
			/* non-fatal */
		}
	}

	async function markAll() {
		if (!$session || busy) return;
		busy = true;
		try {
			const res: any = await mx("notifications.markRead", { token: $session, all: true });
			toastOk(`${res?.updated ?? 0} notification(s) marked read.`);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = false;
		}
	}

	async function savePrefs() {
		if (!$session || busy) return;
		busy = true;
		try {
			await mx("notifications.setPrefs", { token: $session, ...form });
			toastOk("Notification preferences saved.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader title="Notifications" blurb="Security alerts, support replies, plan changes and reviewed announcements — all in one feed.">
	{#if $session}<button class="guru-btn guru-btn-ghost" onclick={markAll} disabled={busy || (feed?.unread ?? 0) === 0}>Mark all read</button>{/if}
</PageHeader>

{#if !$session}
	<div class="guru-card p-6">
		<p class="text-sm text-slate-300">Sign in to see your notifications and choose what reaches you.</p>
		<a class="guru-btn guru-btn-primary mt-4" href="/login">Sign in</a>
	</div>
{:else}
	<div class="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
		<section class="guru-card p-4" aria-live="polite">
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
				<div class="flex gap-1" role="tablist" aria-label="Filter notifications">
					{#each [{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, { key: "announcements", label: "Announcements" }] as tab (tab.key)}
						<button role="tab" aria-selected={filter === tab.key} class="rounded-lg px-2.5 py-1 text-xs transition {filter === tab.key ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-400 hover:bg-white/5'}" onclick={() => (filter = tab.key as any)}>{tab.label}</button>
					{/each}
				</div>
				<span class="text-[11px] text-slate-500">{feed?.unread ?? 0} unread</span>
			</div>

			{#if !feed}
				<div class="mt-3 space-y-2"><div class="guru-skeleton h-14 w-full"></div><div class="guru-skeleton h-14 w-full"></div><div class="guru-skeleton h-14 w-full"></div></div>
			{:else if rows.length === 0}
				<div class="py-12 text-center">
					<p class="text-2xl" aria-hidden="true">◔</p>
					<p class="mt-2 text-sm font-medium text-slate-300">{filter === "unread" ? "You are all caught up" : "Nothing here yet"}</p>
					<p class="mt-1 text-xs text-slate-500">Support replies, account changes and reviewed announcements will appear here.</p>
				</div>
			{:else}
				<ul class="mt-1 divide-y divide-white/8">
					{#each rows as note (note._id)}
						<li class="flex items-start gap-3 py-3 {note.readAt ? 'opacity-70' : ''}">
							<span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs" aria-hidden="true">{icon[note.kind] ?? "◔"}</span>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="text-sm font-medium text-slate-100">{note.title}</p>
									{#if !note.readAt}<span class="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-label="Unread"></span>{/if}
								</div>
								<p class="text-xs leading-relaxed text-slate-400">{note.body}</p>
								<div class="mt-1 flex items-center gap-3 text-[10px] text-slate-600">
									<span>{new Date(note.createdAt).toLocaleString()}</span>
									{#if note.href}<a class="text-indigo-300 hover:underline" href={note.href} onclick={() => markRead(note._id)}>Open</a>{/if}
									{#if !note.readAt}<button class="hover:text-slate-300" onclick={() => markRead(note._id)}>Mark read</button>{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<aside class="guru-card h-fit p-5">
			<h2 class="text-sm font-semibold text-white">Preferences</h2>
			<p class="mt-1 text-xs text-slate-500">Security alerts are always delivered.</p>
			<div class="mt-4 space-y-3">
				{#each [{ key: "product", label: "Product updates", copy: "New modules and improvements" }, { key: "security", label: "Security alerts", copy: "Sign-ins and account changes", locked: !form.security }, { key: "broadcast", label: "Announcements", copy: "Reviewed team announcements" }, { key: "message", label: "Support replies", copy: "Replies in your conversations" }, { key: "emailDigest", label: "Email digest", copy: "Reserved for a future digest" }] as pref (pref.key)}
					<label class="flex cursor-pointer items-start gap-2.5">
						<input type="checkbox" class="mt-0.5 h-4 w-4 accent-indigo-500" bind:checked={form[pref.key as keyof typeof form]} />
						<span>
							<span class="block text-xs font-medium text-slate-200">{pref.label}</span>
							<span class="block text-[11px] text-slate-500">{pref.copy}</span>
						</span>
					</label>
				{/each}
			</div>
			<button class="guru-btn guru-btn-primary mt-4 w-full" onclick={savePrefs} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
			<p class="mt-3 text-[11px] leading-relaxed text-slate-600">Announcements are only sent after a second administrator approves them.</p>
		</aside>
	</div>
{/if}