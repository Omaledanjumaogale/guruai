<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import MarkdownLite from "$lib/components/MarkdownLite.svelte";
	import StatusDot from "$lib/components/StatusDot.svelte";
	import { workspaceId, toastOk, toastErr, errorText } from "$lib/stores";
	import { gq, mx, ax } from "$lib/convex";
	import { route, detectTask, DEFAULT_MODELS, TASK_TYPES } from "$lib/routing";
	import CopyButton from "$lib/components/CopyButton.svelte";

	const wid = $derived($workspaceId);

	// ---- chat list ----
	const S_chats = $derived(wid ? gq("chats.list", { workspaceId: wid }) : null);
	const chats = $derived(S_chats ? $S_chats : null);
	let activeChat = $state<string>("");
	const currentChat = $derived((chats ?? []).find((c) => c._id === activeChat) ?? null);
	const S_messages = $derived(currentChat ? gq("chats.messagesFor", { chatId: currentChat._id }) : null);
	const messages = $derived(S_messages ? ($S_messages ?? []) : []);

	// ---- composer state ----
	let draft = $state("");
	let sending = $state(false);
	let autoRoute = $state(true);
	let manualProvider = $state("openai");
	let manualModel = $state(DEFAULT_MODELS.openai[0].model);

	const S_connectors = $derived(wid ? gq("connectors.list", { workspaceId: wid }) : null);
	const connectors = $derived(S_connectors ? $S_connectors : null);
	const S_routingRules = $derived(wid ? gq("settings.readSetting", { workspaceId: wid, key: "routing.rules" }) : null);
	const routingRules = $derived(S_routingRules ? $S_routingRules : null);

	async function newChat(title = "New chat") {
		const id = (await mx("chats.create", { workspaceId: wid, title, model: "auto", provider: "auto", routedBy: "gururoute" })) as unknown as string;
		activeChat = id;
		return id;
	}

	async function send() {
		const text = draft.trim();
		if (!text || sending) return;
		sending = true;
		draft = "";
		try {
			const chatId = currentChat?._id || activeChat || (await newChat(text.slice(0, 70))) || "";
			if (!chatId) throw new Error("Could not open a chat. Check your connection and try again.");
			activeChat = chatId;
			await mx("chats.addMessage", { chatId, workspaceId: wid, role: "user", content: text });
			// Route the task.
			const task = detectTask(text);
			const available = (connectors ?? []).map((c: any) => ({ provider: c.provider }));
			const result = autoRoute
				? route(task, available, routingRules ?? [])
				: { provider: manualProvider, model: manualModel, reason: "Manual selection", ranked: [] };
			const history = [...(messages ?? []), { role: "user", content: text }].slice(-12).map((m: any) => ({ role: m.role, content: m.content }));
			const out = await ax("ai.chat", { workspaceId: wid, messages: history, provider: result.provider, model: result.model });
			await mx("chats.appendAssistant", { chatId, workspaceId: wid, content: out.text, model: `${result.provider}:${result.model}`, tokens: out.tokens });
			if (autoRoute) toastOk(`GuruRoute → ${result.provider} (${task})`);
		} catch (e) {
			toastErr(e);
			const errText = errorText(e);
			if (activeChat) {
				await mx("chats.addMessage", { chatId: activeChat, workspaceId: wid, role: "system", content: `⚠️ ${errText}` }).catch(() => {});
			}
		} finally {
			sending = false;
		}
	}

	async function act(fn: "pin" | "archive" | "delete") {
		if (!currentChat) return;
		if (fn === "delete") {
			await mx("chats.remove", { id: currentChat._id });
			activeChat = "";
		} else if (fn === "pin") {
			await mx("chats.setPinned", { id: currentChat._id, pinned: !currentChat.pinned });
		} else {
			await mx("chats.setArchived", { id: currentChat._id, archived: true });
			activeChat = "";
		}
	}
</script>

<PageHeader title="Chat" blurb="Multi-model AI chat. Leave the engine on Auto and GuruRoute sends each message to the best connector for the job.">
	<button class="guru-btn guru-btn-primary" onclick={newChat}>＋ New chat</button>
</PageHeader>

<div class="grid gap-4 lg:grid-cols-[260px_1fr]">
	<!-- chat list -->
	<aside class="guru-card max-h-[70vh] overflow-y-auto p-3">
		<div class="mb-2 flex items-center justify-between px-1">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">History</h2>
			{#if currentChat}
				<div class="flex gap-1">
					<button class="rounded p-1 text-xs text-slate-400 hover:text-white" title="Pin" onclick={() => act("pin")}>{currentChat.pinned ? "★" : "☆"}</button>
					<button class="rounded p-1 text-xs text-slate-400 hover:text-white" title="Archive" onclick={() => act("archive")}>🗄</button>
					<button class="rounded p-1 text-xs text-slate-400 hover:text-rose-300" title="Delete" onclick={() => act("delete")}>🗑</button>
				</div>
			{/if}
		</div>
		{#if chats?.length}
			<ul class="space-y-1">
				{#each chats as c (c._id)}
					<li>
						<button class="w-full rounded-lg px-3 py-2 text-left text-sm transition {activeChat === c._id ? 'bg-indigo-500/20 text-indigo-100' : 'text-slate-300 hover:bg-white/5'}" onclick={() => (activeChat = c._id)}>
							<span class="line-clamp-1">{c.pinned ? "★ " : ""}{c.title}</span>
							<span class="text-[10px] text-slate-500">{c.provider}:{c.model}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-1 py-4 text-sm text-slate-500">No chats yet. Start one — history is saved to your workspace.</p>
		{/if}
	</aside>

	<!-- conversation -->
	<section class="guru-card flex min-h-[60vh] flex-col p-0">
		<div class="flex items-center justify-between gap-2 border-b border-indigo-500/10 px-4 py-2.5">
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-1.5 text-xs text-slate-400">
					<input type="checkbox" bind:checked={autoRoute} class="accent-indigo-500" />
					<strong class="text-slate-300">GuruRoute Auto</strong>
				</label>
				{#if !autoRoute}
					<select class="guru-input !w-auto !py-1 text-xs" bind:value={manualProvider}>
						{#each Object.keys(DEFAULT_MODELS) as p (p)}
							<option value={p}>{p}</option>
						{/each}
					</select>
					<select class="guru-input !w-auto !py-1 text-xs" bind:value={manualModel}>
						{#each DEFAULT_MODELS[manualProvider] ?? [] as m (m.model)}
							<option value={m.model}>{m.label}</option>
						{/each}
					</select>
				{/if}
			</div>
			<span class="text-[10px] text-slate-500">{connectors ? `${connectors.length} connector(s) ready` : ""}</span>
		</div>

		<div class="flex-1 space-y-3 overflow-y-auto p-4">
			{#if messages.length === 0}
				<div class="flex h-full flex-col items-center justify-center gap-2 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-2xl text-white">G</div>
					<p class="text-base font-semibold text-slate-200">Ask Guru anything</p>
					<p class="max-w-sm text-sm text-slate-500">Chat, code, analyze, plan — GuruRoute picks the strongest model you have connected for every message.</p>
				</div>
			{:else}
				{#each messages as m (m._id)}
					<div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[85%] rounded-2xl px-4 py-2.5 {m.role === 'user' ? 'bg-indigo-500/25' : 'bg-ink-850/80 border border-indigo-500/10'}">
							{#if m.role === "system"}
								<p class="text-xs text-amber-200">{m.content}</p>
							{:else if m.role === "user"}
								<p class="whitespace-pre-wrap text-[14.5px] leading-relaxed text-slate-100">{m.content}</p>
							{:else}
								<MarkdownLite content={m.content} />
								<div class="mt-1 flex items-center justify-end gap-2">
									{#snippet codeaction(code)}<CopyButton text={code} />{/snippet}
									<span class="text-[10px] text-slate-500">{m.model ?? ""}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
				{#if sending}
					<div class="flex items-center gap-2 text-sm text-slate-400"><span class="guru-spin h-4 w-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-400"></span> Guru is thinking…</div>
				{/if}
			{/if}
		</div>

		<form class="flex items-end gap-2 border-t border-indigo-500/10 p-3" onsubmit={(e) => { e.preventDefault(); send(); }}>
			<textarea
				class="guru-input max-h-40 min-h-[44px] flex-1 resize-y"
				placeholder="Message Guru…  (Enter to send, Shift+Enter for a new line)"
				bind:value={draft}
				onkeydown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						send();
					}
				}}
			></textarea>
			<button class="guru-btn guru-btn-primary" type="submit" disabled={sending || !draft.trim()}>Send</button>
		</form>
	</section>
</div>