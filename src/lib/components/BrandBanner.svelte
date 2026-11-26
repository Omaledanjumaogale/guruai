<script lang="ts">
	import { BANNERS } from "$lib/brand";

	let { name, class: className = "" }: { name: keyof typeof BANNERS; class?: string } = $props();
	const banner = $derived(BANNERS[name]);
</script>

<section class="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0d] {className}" aria-labelledby="{banner.id}-title">
	<svg class="pointer-events-none absolute inset-0 h-full w-full opacity-70" viewBox="0 0 800 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
		<defs>
			<linearGradient id="{banner.id}-stroke" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#818cf8" stop-opacity="0.9" />
				<stop offset="100%" stop-color="#22d3ee" stop-opacity="0.15" />
			</linearGradient>
			<radialGradient id="{banner.id}-glow" cx="78%" cy="30%" r="70%">
				<stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
				<stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
			</radialGradient>
		</defs>
		<rect width="800" height="200" fill="url(#{banner.id}-glow)" />
		{#if banner.variant === "mesh"}
			{#each [[520, 60], [600, 40], [690, 80], [740, 140], [640, 150], [540, 150], [470, 100], [590, 105], [700, 30]] as [x, y]}
				<circle cx={x} cy={y} r="3.5" fill="#a5b4fc" />
			{/each}
			<path d="M470 100 L520 60 L600 40 L690 80 L740 140 L640 150 L540 150 L470 100 M520 60 L590 105 L690 80 M590 105 L540 150 M600 40 L590 105 M690 80 L700 30 L740 140" stroke="url(#{banner.id}-stroke)" stroke-width="1" fill="none" />
		{:else if banner.variant === "orbit"}
			<g fill="none" stroke="url(#{banner.id}-stroke)" stroke-width="1">
				<ellipse cx="640" cy="100" rx="140" ry="62" transform="rotate(-16 640 100)" />
				<ellipse cx="640" cy="100" rx="100" ry="44" transform="rotate(-16 640 100)" />
				<ellipse cx="640" cy="100" rx="60" ry="26" transform="rotate(-16 640 100)" />
			</g>
			<circle cx="760" cy="62" r="4" fill="#67e8f9" /><circle cx="520" cy="128" r="3" fill="#a5b4fc" />
		{:else if banner.variant === "grid"}
			<g stroke="url(#{banner.id}-stroke)" stroke-width="0.8" fill="none">
				{#each Array(7) as _, i}<line x1={420 + i * 55} y1="20" x2={420 + i * 55} y2="180" />{/each}
				{#each Array(5) as _, i}<line x1="420" y1={30 + i * 35} x2="790" y2={30 + i * 35} />{/each}
			</g>
			<circle cx="640" cy="100" r="5" fill="#a5b4fc" />
		{:else if banner.variant === "wave"}
			<g fill="none" stroke="url(#{banner.id}-stroke)" stroke-width="1.2">
				<path d="M420 110 C 470 60, 520 160, 570 110 S 670 60, 720 110 S 790 160, 800 110" />
				<path d="M420 130 C 470 80, 520 180, 570 130 S 670 80, 720 130 S 790 180, 800 130" opacity="0.55" />
			</g>
		{:else if banner.variant === "bars"}
			{#each Array(18) as _, i}
				<rect x={430 + i * 20} y={150 - (12 + ((i * 37) % 92))} width="7" height={12 + ((i * 37) % 92)} rx="3" fill="url(#{banner.id}-stroke)" />
			{/each}
		{:else if banner.variant === "rings"}
			<g fill="none" stroke="url(#{banner.id}-stroke)" stroke-width="1">
				<circle cx="660" cy="100" r="34" /><circle cx="660" cy="100" r="58" opacity="0.7" /><circle cx="660" cy="100" r="82" opacity="0.5" /><circle cx="660" cy="100" r="106" opacity="0.3" />
			</g>
			<circle cx="660" cy="100" r="4" fill="#67e8f9" />
		{/if}
	</svg>
	<div class="relative flex flex-col gap-2 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
		<div class="max-w-xl">
			<p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">{banner.eyebrow}</p>
			<h2 id="{banner.id}-title" class="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">{banner.title}</h2>
			<p class="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">{banner.inscription}</p>
		</div>
	</div>
</section>