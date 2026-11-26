<script lang="ts">
	/** Renders a Guru visual spec as SVG (Napkin-style text→visual). */
	let { spec, editable = false } = $props();

	const palette = ["#6366f1", "#06b6d4", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];
	function colorFor(i: number): string {
		return palette[i % palette.length];
	}

	function shapeFill(node: any, i: number): string {
		return node.shape === "circle" || node.shape === "diamond" ? "transparent" : colorFor(i);
	}

	const W = 900;
	const H = 620;

	function nodePos(id: string) {
		return (spec?.nodes ?? []).find((n: any) => n.id === id);
	}

	function midPoint(e: any) {
		const a = nodePos(e.from);
		const b = nodePos(e.to);
		if (!a || !b) return { x: 0, y: 0 };
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 30 };
	}

	function edgePath(e: any): string {
		const a = nodePos(e.from);
		const b = nodePos(e.to);
		if (!a || !b) return "";
		const midx = (a.x + b.x) / 2;
		const midy = (a.y + b.y) / 2;
		return `M ${a.x} ${a.y} Q ${midx} ${midy - 40} ${b.x} ${b.y}`;
	}
</script>

{#if spec}
	<div class="overflow-x-auto rounded-xl border border-indigo-500/20 bg-ink-950/70 p-2">
		<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label={spec.title ?? "Diagram"}>
			<defs>
				<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="#7c8db5"></path>
				</marker>
			</defs>
			{#if spec.title}
				<text x={W / 2} y="28" text-anchor="middle" fill="#e6ecff" font-size="17" font-weight="700">{spec.title}</text>
			{/if}
			{#each (spec.edges ?? []) as e (e.from + e.to)}
				{#if edgePath(e)}
					<path d={edgePath(e)} fill="none" stroke="#4a5a8a" stroke-width="1.6" marker-end="url(#arrow)"></path>
					{#if e.label}
						{@const mid = midPoint(e)}
						<text x={mid.x} y={mid.y} text-anchor="middle" fill="#8fa0c8" font-size="10">{e.label}</text>
					{/if}
				{/if}
			{/each}
			{#each (spec.nodes ?? []) as n, i (n.id)}
				{@const color = colorFor(i)}
				{#if n.shape === "diamond"}
					<polygon points="{n.x},{n.y - 34} {n.x + 60},{n.y} {n.x},{n.y + 34} {n.x - 60},{n.y}" fill="rgba(99,102,241,0.12)" stroke={color} stroke-width="2"></polygon>
					<text x={n.x} y={n.y + 3} text-anchor="middle" fill="#e6ecff" font-size="11">{n.label}</text>
				{:else if n.shape === "circle"}
					<circle cx={n.x} cy={n.y} r="30" fill="rgba(99,102,241,0.12)" stroke={color} stroke-width="2"></circle>
					<text x={n.x} y={n.y + 3} text-anchor="middle" fill="#e6ecff" font-size="10">{n.label.slice(0, 8)}</text>
				{:else}
					{@const w = Math.max(120, Math.min(220, (n.label?.length ?? 8) * 7 + 30))}
					{@const h = n.shape === "pill" ? 34 : 42}
					<rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={n.shape === "pill" ? h / 2 : 10} fill="rgba(99,102,241,0.14)" stroke={color} stroke-width="2"></rect>
					{@const lines = String(n.label).split("\n")}
					{#each lines.slice(0, 2) as line, li (li)}
						<text x={n.x} y={n.y + (lines.length === 1 ? 4 : li === 0 ? -2 : 12)} text-anchor="middle" fill="#e6ecff" font-size="11.5">{line}</text>
					{/each}
				{/if}
			{/each}
		</svg>
	</div>
{/if}
