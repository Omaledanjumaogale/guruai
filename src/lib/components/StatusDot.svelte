<script lang="ts">
	let { status = "untested" } = $props();
	const map: Record<string, { color: string; label: string }> = {
		ok: { color: "bg-emerald-400", label: "Live" },
		error: { color: "bg-rose-400", label: "Error" },
		untested: { color: "bg-amber-300", label: "Untested" },
		done: { color: "bg-emerald-400", label: "Done" },
		running: { color: "bg-amber-300 guru-pulse", label: "Running" },
		pending: { color: "bg-amber-300", label: "Pending" },
		approved: { color: "bg-emerald-400", label: "Approved" },
		rejected: { color: "bg-slate-500", label: "Rejected" },
		error_run: { color: "bg-rose-400", label: "Failed" }
	};
	const s = $derived(map[status] ?? { color: "bg-slate-500", label: status });
</script>

<span class="inline-flex items-center gap-1.5 rounded-full bg-ink-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300">
	<span class="h-1.5 w-1.5 rounded-full {s.color}"></span>
	{s.label}
</span>
