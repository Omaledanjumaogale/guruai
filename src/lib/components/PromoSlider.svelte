<script lang="ts">
	import { SLIDES } from "$lib/brand";

	let index = $state(0);
	let paused = $state(false);
	const total = SLIDES.length;

	function go(next: number) {
		index = (next + total) % total;
	}

	$effect(() => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce || paused) return;
		const timer = setInterval(() => go(index + 1), 7000);
		return () => clearInterval(timer);
	});
</script>

<section
	class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0e]"
	aria-roledescription="carousel"
	aria-label="Guru AI highlights"
	data-testid="promo-slider"
	onmouseenter={() => (paused = true)}
	onmouseleave={() => (paused = false)}
	onfocusin={() => (paused = true)}
	onfocusout={() => (paused = false)}
>
	<div class="relative aspect-[16/9] w-full sm:aspect-[21/9]">
		{#each SLIDES as slide, i (slide.src)}
			<div
				class="absolute inset-0 transition-opacity duration-700 {i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}"
				aria-hidden={i !== index}
				data-testid="promo-slide"
			>
				<picture>
					<source type="image/webp" srcset={slide.srcset} sizes="(max-width: 1180px) 100vw, 1180px" />
					<img
						src={slide.src}
						alt={slide.alt}
						width="1536"
						height="864"
						loading={i === 0 ? "eager" : "lazy"}
						fetchpriority={i === 0 ? "high" : "auto"}
						decoding="async"
						class="h-full w-full object-cover"
					/>
				</picture>
				<div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
				<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20"></div>
				<div class="absolute inset-0 flex items-end p-6 sm:items-center sm:p-10 lg:p-14">
					<div class="max-w-xl">
						<p class="eyebrow">{slide.eyebrow}</p>
						<h2 class="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.1rem]">{slide.title}</h2>
						<p class="mt-3 hidden max-w-md text-sm leading-relaxed text-slate-300 sm:block">{slide.copy}</p>
						<a href={slide.href} class="guru-btn guru-btn-primary mt-5">{slide.cta} <span aria-hidden="true">→</span></a>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 sm:px-6">
		<div class="flex items-center gap-1.5" role="tablist" aria-label="Choose a highlight">
			{#each SLIDES as slide, i (slide.src)}
				<button
					role="tab"
					aria-selected={i === index}
					aria-label={`Show ${slide.eyebrow} highlight`}
					class="h-1.5 rounded-full transition-all {i === index ? 'w-8 bg-indigo-400' : 'w-2.5 bg-white/25 hover:bg-white/50'}"
					onclick={() => go(i)}
				></button>
			{/each}
		</div>
		<div class="flex items-center gap-2">
			<span class="text-[11px] tabular-nums text-slate-500" aria-live="polite">{index + 1} / {total}</span>
			<button class="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40" onclick={() => go(index - 1)} aria-label="Previous highlight">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
			</button>
			<button class="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40" onclick={() => go(index + 1)} aria-label="Next highlight">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
			</button>
		</div>
	</div>
</section>