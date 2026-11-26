<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { gq, mx } from "$lib/convex";
	import { session } from "$lib/auth";
	import { toastOk, toastErr } from "$lib/stores";
	import { can, type Me } from "$lib/access";

	const S_me = $derived($session ? gq<Me>("rbac.me", { token: $session }) : null);
	const me = $derived(S_me ? $S_me : null);
	const S_list = $derived($session ? gq<any[]>("messaging.listMine", { token: $session }) : null);
	const conversations = $derived($S_list ? ($S_list ?? []) : null);
	let activeId = $state("");
	const S_thread = $derived($session && activeId ? gq<any>("messaging.thread", { token: $session, conversationId: activeId }) : null);
	const thread = $derived($S_thread ? $S_thread : null);

	let composing = $state(false);
	let subject = $state("");
	let body = $state("");
	let reply = $state("");
	let busy = $state(false);

	async function open(id: string) {
		activeId = id;
		if (!$session) return;
		try {
			await mx("messaging.markRead", { token: $session, conversationId: id });
		} catch {
			/* non-fatal */
		}
	}

	async function startConversation() {
		if (!$session || busy) return;
		busy = true;
		try {
			const res: any = await mx("messaging.start", { token: $session, subject, body });
			toastOk("Conversation started — the team has been notified.");
			composing = false;
			subject = "";
			body = "";
			if (res?.conversationId) await open(res.conversationId);
		} catch (error) {
			toastErr(error);
		} finally {
			busy = false;
		}
	}

	async function sendReply() {
		if (!$session || !activeId || busy || !reply.trim()) return;
		busy = true;
		try {
			await mx("messaging.send", { token: $session, conversationId: activeId, body: reply });
			reply = "";
		} catch (error) {
			toastErr(error);
		} finally {
			busy = false;
		}
	}

	async function closeConversation() {
		if (!$session || !activeId || busy) return;
		busy = true;
		try {
			await mx("messaging.close", { token: $session, conversationId: activeId });
			toastOk("Conversation closed.");
		} catch (error) {
			toastErr(error);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader title="Messages" blurb="A private line to the Guru AI team. Only you and the people in the thread can read it.">
	{#if $session}<button class="guru-btn guru-btn-primary" onclick={() => (composing = !composing)}>＋ New conversation</button>{/if}
</PageHeader>

{#if !$session}
	<div class="guru-card p-6">
		<p class="text-sm text-slate-300">Sign in to start a private conversation with the team.</p>
		<a class="guru-btn guru-btn-primary mt-4" href="/login">Sign in</a>
	</div>
{:else}
	{#if can(me, "messages.manage")}
		<a href="/admin?tab=messages" class="mb-4 flex items-center justify-between rounded-xl border border-indigo-400/25 bg-indigo-400/[0.06] px-4 py-2.5 text-xs text-indigo-200 transition hover:border-indigo-400/50">
			<span>You can manage every member conversation in the admin console.</span>
			<span>Open inbox →</span>
		</a>
	{/if}

	{#if composing}
		<form class="guru-card mb-4 p-5" onsubmit={(e) => { e.preventDefault(); startConversation(); }}>
			<h2 class="text-sm font-semibold text-white">New conversation</h2>
			<label class="mt-3 block"><span class="guru-label">Subject</span><input class="guru-input mt-1" required maxlength="120" bind:value={subject} placeholder="What do you need help with?" /></label>
			<label class="mt-3 block"><span class="guru-label">Message</span><textarea class="guru-input mt-1 min-h-28" required maxlength="4000" bind:value={body} placeholder="Include the module, what you tried and what happened."></textarea></label>
			<div class="mt-3 flex gap-2"><button class="guru-btn guru-btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Start conversation"}</button><button class="guru-btn guru-btn-ghost" type="button" onclick={() => (composing = false)}>Cancel</button></div>
		</form>
	{/if}

	<div class="grid gap-4 lg:grid-cols-[320px_1fr]">
		<aside class="guru-card max-h-[70vh] overflow-y-auto p-3" aria-label="Conversations">
			{#if conversations === null}
				<div class="space-y-2"><div class="guru-skeleton h-14 w-full"></div><div class="guru-skeleton h-14 w-full"></div><div class="guru-skeleton h-14 w-full"></div></div>
			{:else if conversations.length === 0}
				<p class="px-2 py-6 text-center text-sm text-slate-500">No conversations yet. Start one and the team will reply here.</p>
			{:else}
				<ul class="space-y-1">
					{#each conversations as c (c._id)}
						<li>
							<button class="w-full rounded-lg px-3 py-2.5 text-left transition {activeId === c._id ? 'bg-indigo-500/15' : 'hover:bg-white/5'}" onclick={() => open(c._id)}>
								<div class="flex items-center justify-between gap-2">
									<span class="truncate text-sm font-medium text-slate-200">{c.subject}</span>
									{#if c.unread}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-label="Unread"></span>{/if}
								</div>
								<p class="truncate text-[11px] text-slate-500">{c.preview || "No messages yet"}</p>
								<p class="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">{c.status} · {new Date(c.lastMessageAt).toLocaleDateString()}</p>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>

		<section class="guru-card flex min-h-[60vh] flex-col p-4" aria-live="polite">
			{#if !activeId}
				<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
					<p class="text-2xl" aria-hidden="true">✉</p>
					<p class="text-sm font-medium text-slate-300">Choose a conversation</p>
					<p class="max-w-xs text-xs text-slate-500">Or start a new one. Replies arrive here and in your notifications.</p>
				</div>
			{:else if !thread}
				<div class="space-y-3"><div class="guru-skeleton h-16 w-2/3"></div><div class="guru-skeleton ml-auto h-16 w-1/2"></div><div class="guru-skeleton h-16 w-2/3"></div></div>
			{:else}
				<header class="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-3">
					<div>
						<h2 class="text-sm font-semibold text-white">{thread.conversation.subject}</h2>
						<p class="text-[11px] text-slate-500">{thread.conversation.status} · opened {new Date(thread.conversation.createdAt).toLocaleDateString()}</p>
					</div>
					{#if thread.conversation.status !== "closed"}
						<button class="text-[11px] text-slate-400 hover:text-rose-300" onclick={closeConversation} disabled={busy}>Close conversation</button>
					{/if}
				</header>
				<div class="mt-3 flex-1 space-y-3 overflow-y-auto">
					{#each thread.messages as message (message._id)}
						<div class="flex {message.senderId === thread.meId ? 'justify-end' : 'justify-start'}">
							<div class="max-w-[85%] rounded-xl px-3 py-2 text-sm {message.senderId === thread.meId ? 'bg-indigo-500/20 text-indigo-50' : 'bg-white/[0.04] text-slate-200'}">
								<p class="mb-0.5 text-[10px] uppercase tracking-wider text-slate-500">{message.senderLabel} · {new Date(message.createdAt).toLocaleTimeString()}</p>
								<p class="whitespace-pre-wrap leading-relaxed">{message.body}</p>
							</div>
						</div>
					{/each}
				</div>
				{#if thread.conversation.status === "closed"}
					<p class="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">This conversation is closed. Start a new one to continue.</p>
				{:else}
					<form class="mt-3 flex items-end gap-2 border-t border-white/8 pt-3" onsubmit={(e) => { e.preventDefault(); sendReply(); }}>
						<textarea class="guru-input min-h-11 flex-1 resize-none" rows="2" bind:value={reply} placeholder="Write a reply…" maxlength="4000" onkeydown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}></textarea>
						<button class="guru-btn guru-btn-primary" type="submit" disabled={busy || !reply.trim()}>Send</button>
					</form>
				{/if}
			{/if}
		</section>
	</div>
{/if}