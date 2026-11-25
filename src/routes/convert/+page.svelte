<script lang="ts">
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { toastOk } from "$lib/stores";

	type Tool = { id: string; label: string; blurb: string; icon: string };

	const TOOLS: Tool[] = [
		{ id: "image", label: "Image converter", blurb: "PNG · JPEG · WebP · resize & quality", icon: "▦" },
		{ id: "jsoncsv", label: "JSON ⇄ CSV", blurb: "Paste one side, get the other", icon: "⇄" },
		{ id: "yaml", label: "JSON ⇄ YAML", blurb: "Config and pipeline formats", icon: "⇄" },
		{ id: "b64", label: "Base64 encode/decode", blurb: "Text and JSON payloads", icon: "⚿" },
		{ id: "md", label: "Markdown → HTML", blurb: "Render and copy clean HTML", icon: "✎" },
		{ id: "text", label: "Text utilities", blurb: "Case, slug, count, dedupe, sort", icon: "Aa" }
	];

	let tool = $state("image");
	let input = $state("");
	let output = $state("");
	let imageTarget = $state("image/jpeg");
	let imageQuality = $state(0.9);
	let imageMaxW = $state(0);
	let fileInput = $state<HTMLInputElement | null>(null);

	function convert() {
		output = "";
		try {
			switch (tool) {
				case "jsoncsv":
					output = input.trim().startsWith("[") || input.trim().startsWith("{") ? jsonToCsv(input) : csvToJson(input);
					break;
				case "yaml":
					output = input.trim().startsWith("{") || input.trim().startsWith("[") ? jsonToYaml(input) : yamlToJson(input);
					break;
				case "b64":
					output = /^[A-Za-z0-9+/=\s]+$/.test(input.trim()) && input.trim().length > 12 && !input.includes("{") && !input.includes(" ")
						? atob(input.replace(/\s/g, ""))
						: btoa(input);
					break;
				case "md":
					output = markdownToHtml(input);
					break;
				case "text":
					output = textUtils(input);
					break;
			}
			toastOk("Converted");
		} catch (e) {
			toastOk(`⚠ ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	function jsonToCsv(json: string): string {
		const rows = JSON.parse(json);
		if (!Array.isArray(rows)) throw new Error("JSON must be an array of objects for CSV conversion.");
		const cols = [...new Set(rows.flatMap((r: any) => Object.keys(r ?? {})))];
		const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
		return [cols.map(esc).join(","), ...rows.map((r: any) => cols.map((c) => esc(r?.[c])).join(","))].join("\n");
	}

	function csvToJson(csv: string): string {
		const lines = csv.split(/\r?\n/).filter((l) => l.trim());
		const parseLine = (line: string): string[] => {
			const out: string[] = [];
			let cur = "";
			let q = false;
			for (let i = 0; i < line.length; i++) {
				const ch = line[i];
				if (q) {
					if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
					else if (ch === '"') q = false;
					else cur += ch;
				} else if (ch === '"') q = true;
				else if (ch === ",") { out.push(cur); cur = ""; }
				else cur += ch;
			}
			out.push(cur);
			return out;
		};
		const header = parseLine(lines[0]);
		return JSON.stringify(lines.slice(1).map((l) => Object.fromEntries(parseLine(l).map((v, i) => [header[i] ?? `col${i}`, v]))), null, 2);
	}

	function jsonToYaml(json: string): string {
		const walk = (v: any, indent: number): string => {
			const pad = "  ".repeat(indent);
			if (v === null) return "null";
			if (Array.isArray(v)) return v.map((x) => `\n${pad}- ${typeof x === "object" && x ? walk(x, indent + 1).trimStart() : JSON.stringify(x)}`).join("");
			if (typeof v === "object") {
				return Object.entries(v).map(([k, val]) => {
					if (typeof val === "object" && val !== null) return `${pad}${k}:${walk(val, indent + 1)}`;
					return `${pad}${k}: ${JSON.stringify(val)}`;
				}).join("\n");
			}
			return ` ${JSON.stringify(v)}`;
		};
		return walk(JSON.parse(json), 0);
	}

	function yamlToJson(yaml: string): string {
		// Minimal YAML (flat maps + simple arrays) → JSON.
		const result: any = {};
		let lastKey: string | null = null;
		for (const raw of yaml.split(/\r?\n/)) {
			if (!raw.trim() || raw.trim().startsWith("#")) continue;
			const indent = raw.length - raw.trimStart().length;
			const line = raw.trim();
			const kv = line.match(/^([^:]+):\s*(.*)$/);
			if (indent === 0 && kv) {
				const val = kv[2].trim();
				result[kv[1].trim()] = val === "" ? [] : val.replace(/^["']|["']$/g, "");
				lastKey = kv[1].trim();
			} else if (line.startsWith("- ") && lastKey) {
				if (!Array.isArray(result[lastKey])) result[lastKey] = [];
				result[lastKey].push(line.slice(2).replace(/^["']|["']$/g, ""));
			}
		}
		return JSON.stringify(result, null, 2);
	}

	function markdownToHtml(md: string): string {
		const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const lines = esc(md).split(/\r?\n/);
		const out: string[] = [];
		for (const line of lines) {
			const h = line.match(/^(#{1,4})\s+(.*)/);
			if (h) out.push(`<h${h[1].length}>${h[2]}</h${h[1].length}>`);
			else if (/^\s*[-*]\s+/.test(line)) out.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
			else if (line.trim() === "") out.push("");
			else out.push(`<p>${line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`);
		}
		return out.join("\n");
	}

	function textUtils(text: string): string {
		return JSON.stringify(
			{
				words: text.trim() ? text.trim().split(/\s+/).length : 0,
				characters: text.length,
				lines: text.split(/\r?\n/).length,
				UPPERCASE: text.toUpperCase(),
				lowercase: text.toLowerCase(),
				Title_Case: text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()),
				slug: text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
				uniqueLines: [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))]
			},
			null,
			2
		);
	}

	async function handleImage(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		const img = new Image();
		img.onload = () => {
			const scale = imageMaxW > 0 ? Math.min(1, imageMaxW / img.width) : 1;
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(img.width * scale);
			canvas.height = Math.round(img.height * scale);
			canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob(
				(blob) => {
					if (!blob) return;
					output = `${blob.size.toLocaleString()} bytes ready`;
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = `guru-converted.${imageTarget.split("/")[1].replace("jpeg", "jpg")}`;
					a.click();
					URL.revokeObjectURL(a.href);
					toastOk("Image converted and downloaded");
				},
				imageTarget,
				imageQuality
			);
		};
		img.src = URL.createObjectURL(file);
	}
</script>

<PageHeader title="Convert" blurb="A full conversion toolbox that runs entirely in your browser — fast, private, no uploads. Harmonized from FreeConvert." />

<div class="grid gap-4 lg:grid-cols-[240px_1fr]">
	<nav class="guru-card h-fit p-3">
		{#each TOOLS as t (t.id)}
			<button class="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition {tool === t.id ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-400 hover:bg-white/5'}" onclick={() => (tool = t.id)}>
				<span>{t.icon}</span>
				<div>
					<p class="font-medium">{t.label}</p>
					<p class="text-[10px] text-slate-500">{t.blurb}</p>
				</div>
			</button>
		{/each}
	</nav>

	<section class="guru-card p-5">
		{#if tool === "image"}
			<div class="grid gap-4 sm:grid-cols-3">
				<div>
					<label class="guru-label" for="fmt">Output format</label>
					<select id="fmt" class="guru-input" bind:value={imageTarget}>
						<option value="image/jpeg">JPEG</option>
						<option value="image/png">PNG</option>
						<option value="image/webp">WebP</option>
					</select>
				</div>
				<div>
					<label class="guru-label" for="q">Quality: {Math.round(imageQuality * 100)}%</label>
					<input id="q" type="range" min="0.1" max="1" step="0.05" bind:value={imageQuality} class="w-full accent-indigo-500" />
				</div>
				<div>
					<label class="guru-label" for="mw">Max width (0 = keep)</label>
					<input id="mw" type="number" class="guru-input" bind:value={imageMaxW} />
				</div>
			</div>
			<label class="mt-4 flex h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-indigo-500/30 text-sm text-slate-400 hover:border-indigo-400/60">
				<input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={(e) => handleImage((e.target as HTMLInputElement).files)} />
				Drop an image here or click to choose — conversion downloads instantly.
			</label>
		{:else}
			<div class="grid gap-4 lg:grid-cols-2">
				<div>
					<label class="guru-label" for="in">Input</label>
					<textarea id="in" class="guru-input min-h-[300px] font-mono text-[13px]" bind:value={input} placeholder={tool === "md" ? "# Heading\n\nSome **bold** text" : "Paste input here…"}></textarea>
				</div>
				<div>
					<div class="flex items-center justify-between">
						<label class="guru-label" for="out2">Output</label>
						{#if output}
							<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={() => navigator.clipboard.writeText(output)}>Copy</button>
						{/if}
					</div>
					<textarea id="out2" class="guru-input min-h-[300px] font-mono text-[13px]" readonly value={output} placeholder="Output appears here…"></textarea>
				</div>
			</div>
			<button class="guru-btn guru-btn-primary mt-4" disabled={!input.trim()} onclick={convert}>Convert</button>
		{/if}
	</section>
</div>
