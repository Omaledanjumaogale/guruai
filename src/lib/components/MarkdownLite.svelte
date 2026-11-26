<script lang="ts">
	/**
	 * Tiny, dependency-free markdown renderer: fenced code, headings, lists,
	 * bold/italic/inline code/links. Good enough for chat output.
	 */
	import type { Snippet } from "svelte";

	let { content, codeaction }: { content: string; codeaction?: Snippet<[string]> } = $props();

	function esc(s: string): string {
		return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	function inline(s: string): string {
		return esc(s)
			.replace(/`([^`]+)`/g, '<code class="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[12.5px] text-cyan-200">$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
			.replace(/(^|\W)\*([^*]+)\*/g, "$1<em>$2</em>")
			.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="text-indigo-300 underline" href="$2" target="_blank" rel="noreferrer">$1</a>');
	}

	const blocks = $derived.by(() => {
		const parts: { kind: "code" | "md"; lang?: string; body: string }[] = [];
		const re = /```(\w*)\n([\s\S]*?)```/g;
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(content)) !== null) {
			if (m.index > last) parts.push({ kind: "md", body: content.slice(last, m.index) });
			parts.push({ kind: "code", lang: m[1] || "text", body: m[2] });
			last = m.index + m[0].length;
		}
		if (last < content.length) parts.push({ kind: "md", body: content.slice(last) });
		return parts;
	});

	function renderMd(body: string): string {
		const lines = esc(body).split("\n");
		const out: string[] = [];
		let inList = false;
		for (const raw of lines) {
			const li = raw.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
			if (li) {
				if (!inList) {
					out.push("<ul class='my-1.5 list-disc space-y-1 pl-5'>");
					inList = true;
				}
				out.push(`<li>${inline(li[1])}</li>`);
				continue;
			}
			if (inList) {
				out.push("</ul>");
				inList = false;
			}
			const h = raw.match(/^(#{1,4})\s+(.*)/);
			if (h) {
				const size = ["text-xl", "text-lg", "text-base", "text-sm"][h[1].length - 1];
				out.push(`<p class="mt-2 mb-1 ${size} font-semibold text-white">${inline(h[2])}</p>`);
			} else if (raw.trim() === "") {
				out.push("<div class='h-2'></div>");
			} else {
				out.push(`<p class="my-1 leading-relaxed">${inline(raw)}</p>`);
			}
		}
		if (inList) out.push("</ul>");
		return out.join("");
	}
</script>

<div class="text-[14.5px] text-slate-200">
	{#each blocks as b, i (i)}
		{#if b.kind === "code"}
			<div class="my-2 overflow-hidden rounded-lg border border-indigo-500/20">
				<div class="flex items-center justify-between bg-ink-800/80 px-3 py-1.5">
					<span class="font-mono text-[11px] uppercase tracking-wider text-slate-400">{b.lang}</span>
					{@render codeaction?.(b.body)}
				</div>
				<pre class="overflow-x-auto bg-ink-950/80 p-3 font-mono text-[12.5px] leading-relaxed text-cyan-100">{b.body}</pre>
			</div>
		{:else}
			{@html renderMd(b.body)}
		{/if}
	{/each}
</div>
