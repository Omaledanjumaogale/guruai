<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import BrandBanner from "$lib/components/BrandBanner.svelte";
	import { workspaceId, toastOk } from "$lib/stores";
	import { gq, mx } from "$lib/convex";

	const wid = $derived($workspaceId);
	let view = $state<"notes" | "archive">("notes");
	const S_notes = $derived(wid ? gq("notes.list", { workspaceId: wid, archived: view === "archive" }) : null);
	const notes = $derived(S_notes ? $S_notes : null);
	let search = $state("");
	let editing = $state<any>(null);
	let draft = $state({ title: "", body: "", color: "default", tags: "" });

	const COLORS: Record<string, string> = {
		default: "bg-ink-800",
		indigo: "bg-indigo-900/60",
		cyan: "bg-cyan-900/50",
		emerald: "bg-emerald-900/50",
		amber: "bg-amber-900/50",
		rose: "bg-rose-900/50"
	};

	const filtered = $derived(
		(notes ?? []).filter(
			(n: any) => search.trim() === "" || `${n.title} ${n.body} ${(n.tags ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase())
		)
	);

	async function save() {
		const tags = draft.tags.split(",").map((t) => t.trim()).filter(Boolean);
		if (editing) {
			await mx("notes.update", { id: editing._id, title: draft.title, body: draft.body, color: draft.color, tags });
		} else {
			const id = await mx("notes.create", { workspaceId: wid, title: draft.title, body: draft.body, color: draft.color, tags });
			editing = { _id: id };
		}
		// Re-read into the editor so it feels like one live document.
		editing = { ...editing, title: draft.title, body: draft.body };
		toastOk("Note saved");
	}

	async function quickCreate() {
		const id = await mx("notes.create", { workspaceId: wid });
		editing = { _id: id, title: "", body: "", color: "default", tags: [] };
		draft = { title: "", body: "", color: "default", tags: "" };
	}
</script>

<PageHeader title="Notes" blurb="Fast capture with pins, colors, tags and instant search — the Keep experience, saved to your workspace.">
	<button class="guru-btn guru-btn-primary" onclick={quickCreate}>＋ New note</button>
</PageHeader>

<BrandBanner name="notes" />

<div class="mb-4 flex flex-wrap items-center gap-3">
	<input class="guru-input !w-64" placeholder="Search notes…" bind:value={search} />
	<div class="flex rounded-lg border border-indigo-500/20 p-0.5 text-xs">
		<button class="rounded-md px-3 py-1.5 {view === 'notes' ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400'}" onclick={() => (view = "notes")}>Notes</button>
		<button class="rounded-md px-3 py-1.5 {view === 'archive' ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400'}" onclick={() => (view = "archive")}>Archive</button>
	</div>
</div>

<div class="grid gap-4 lg:grid-cols-[1fr_320px]">
	<section class="columns-1 gap-3 sm:columns-2 xl:columns-3 [&>*]:mb-3">
		{#if filtered.length === 0}
			<div class="guru-card break-inside-avoid p-8 text-center text-sm text-slate-500">
				{view === "archive" ? "Archive is empty." : "No notes yet — click “New note”."}
			</div>
		{/if}
		{#each filtered as n (n._id)}
			<button
				class="w-full break-inside-avoid rounded-xl border border-indigo-500/10 p-3.5 text-left transition hover:border-indigo-400/40 {COLORS[n.color] ?? COLORS.default}"
				onclick={() => {
					editing = n;
					draft = { title: n.title, body: n.body, color: n.color, tags: (n.tags ?? []).join(", ") };
				}}
			>
				<div class="flex items-start justify-between gap-2">
					<h3 class="text-sm font-semibold text-slate-100">{n.title || "Untitled"}</h3>
					<span class="text-xs text-amber-300">{n.pinned ? "★" : ""}</span>
				</div>
				<p class="mt-1 line-clamp-5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-300/90">{n.body}</p>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each n.tags ?? [] as t (t)}
						<span class="rounded bg-black/25 px-1.5 py-0.5 text-[10px] text-indigo-200">#{t}</span>
					{/each}
				</div>
			</button>
		{/each}
	</section>

	<aside class="guru-card h-fit p-5">
		{#if editing}
			<div>
				<input class="guru-input !border-0 !bg-transparent !px-0 text-base font-semibold" placeholder="Title" bind:value={draft.title} />
				<textarea class="guru-input mt-2 min-h-[200px] !border-0 !bg-transparent !px-0" placeholder="Start typing…" bind:value={draft.body}></textarea>
				<div class="mt-3 flex flex-wrap items-center gap-2 border-t border-indigo-500/10 pt-3">
					{#each Object.keys(COLORS) as c (c)}
						<button class="h-5 w-5 rounded-full border border-white/20 {COLORS[c]} {draft.color === c ? 'ring-2 ring-white/50' : ''}" onclick={() => (draft.color = c)} aria-label={c}></button>
					{/each}
					<span class="flex-1"></span>
					<button class="text-sm text-slate-400 hover:text-amber-300" title="Pin" onclick={() => mx("notes.update", { id: editing._id, pinned: !editing.pinned }).then(() => (editing = { ...editing, pinned: !editing.pinned }))}>
						{editing.pinned ? "★" : "☆"}
					</button>
					<button class="text-sm text-slate-400 hover:text-white" title="Archive" onclick={() => { mx("notes.update", { id: editing._id, archived: true }); editing = null; }}>🗄</button>
					<button class="text-sm text-slate-400 hover:text-rose-300" title="Delete" onclick={() => { mx("notes.remove", { id: editing._id }); editing = null; }}>🗑</button>
				</div>
				<input class="guru-input mt-3 text-xs" placeholder="tags, comma separated" bind:value={draft.tags} />
				<button class="guru-btn guru-btn-primary mt-3 w-full" onclick={save}>Save note</button>
			</div>
		{:else}
			<p class="py-10 text-center text-sm text-slate-500">Select or create a note to edit it here.</p>
		{/if}
	</aside>
</div>
