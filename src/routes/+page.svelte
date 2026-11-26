<script lang="ts">
	import PromoSlider from "$lib/components/PromoSlider.svelte";
	import { SLIDES, STORY, FEATURES, TRUST } from "$lib/brand";
	import { NAV } from "$lib/nav";
	import { account } from "$lib/auth";

	const modules = NAV.filter((n) => !["/", "/home", "/inbox", "/notifications", "/roles", "/subscription", "/admin", "/profile"].includes(n.href));
	const featured = SLIDES[0];
</script>

<svelte:head>
	<meta name="description" content="Guru AI harmonises 18 AI modules into one enterprise workspace: chat, image, video, music, diagrams, humanizer, keyword research, transcripts, converters, notes and agents — with role-based access and an audit trail." />
</svelte:head>

<div class="bg-[#050505] text-slate-200">
	<header class="sticky top-0 z-40 border-b border-white/8 bg-[#050505]/85 backdrop-blur-xl">
		<div class="marketing-wrap flex h-16 items-center justify-between gap-6">
			<a href="/" class="flex items-center gap-2.5" aria-label="Guru AI home">
				<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">G</span>
				<span class="text-sm font-bold tracking-wide text-white">Guru <span class="guru-gradient-text">AI</span></span>
			</a>
			<nav class="hidden items-center gap-7 text-[13px] text-slate-400 md:flex" aria-label="Product sections">
				<a class="transition hover:text-white" href="#story">Story</a>
				<a class="transition hover:text-white" href="#features">Features</a>
				<a class="transition hover:text-white" href="#modules">Modules</a>
				<a class="transition hover:text-white" href="#trust">Security</a>
			</nav>
			<div class="flex items-center gap-2">
				{#if $account}
					<a href="/home" class="guru-btn guru-btn-primary !py-2 !text-[13px]">Open workspace</a>
				{:else}
					<a href="/login" class="hidden text-[13px] text-slate-300 transition hover:text-white sm:block">Sign in</a>
					<a href="/login" class="guru-btn guru-btn-primary !py-2 !text-[13px]">Get started</a>
				{/if}
			</div>
		</div>
	</header>

	<section class="relative isolate overflow-hidden" aria-labelledby="hero-title">
		<img
			src="/images/generated/dashboard-ecosystem.webp"
			srcset="/images/responsive/dashboard-ecosystem-640.webp 640w, /images/responsive/dashboard-ecosystem-1024.webp 1024w, /images/generated/dashboard-ecosystem.webp 1536w"
			sizes="100vw"
			alt="An abstract ecosystem of translucent dashboard panels orbiting a glowing violet core"
			width="1536"
			height="864"
			loading="eager"
			fetchpriority="high"
			class="absolute inset-0 h-full w-full object-cover opacity-[0.55]"
		/>
		<div class="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/85 to-[#050505]/30"></div>
		<div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/60"></div>
		<div class="marketing-wrap relative grid gap-12 py-20 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
			<div>
				<p class="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200">
					<span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
					Enterprise AI workspace
				</p>
				<h1 id="hero-title" class="display mt-5 max-w-2xl text-white">Every AI tool you reach for. <span class="guru-gradient-text">One calm workspace.</span></h1>
				<p class="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
					Guru AI harmonises the tools you already trust — chat, imagery, video, music, diagrams, research, transcripts, conversion and agents — behind one sign-in, one design language and one audit trail.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<a href="/home" class="guru-btn guru-btn-primary !px-5 !py-3">Open the workspace <span aria-hidden="true">→</span></a>
					<a href="#story" class="guru-btn guru-btn-ghost !px-5 !py-3">See how it works</a>
				</div>
				<dl class="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
					{#each TRUST as stat (stat.label)}
						<div>
							<dt class="sr-only">{stat.label}</dt>
							<dd class="text-2xl font-semibold tracking-tight text-white">{stat.value}</dd>
							<dd class="text-[11px] uppercase tracking-wider text-slate-500">{stat.label}</dd>
						</div>
					{/each}
				</dl>
			</div>

			<div class="relative hidden lg:block" aria-hidden="true">
				<div class="guru-card relative ml-auto w-[360px] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
					<div class="flex items-center justify-between border-b border-white/8 pb-3">
						<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live workspace</p>
						<span class="guru-chip border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Connected</span>
					</div>
					<ul class="mt-3 space-y-3">
						{#each [{ icon: "◈", title: "Chat · GuruRoute", meta: "agnes-2.5-pro-alpha · 1.2s" }, { icon: "▦", title: "Image Studio", meta: "1536×1024 · 4.1s" }, { icon: "✎", title: "Humanizer", meta: "412 words · natural voice" }, { icon: "⌕", title: "Keyword research", meta: "48 question clusters" }] as row (row.title)}
							<li class="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
								<span class="text-indigo-300">{row.icon}</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-xs font-medium text-slate-200">{row.title}</span>
									<span class="block truncate text-[10px] text-slate-500">{row.meta}</span>
								</span>
								<span class="text-[10px] text-emerald-400">done</span>
							</li>
						{/each}
					</ul>
					<div class="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[10px] text-slate-500">
						<span>1 workspace · 18 modules</span>
						<span>audit on</span>
					</div>
				</div>
				<div class="absolute -left-6 top-8 rounded-xl border border-white/10 bg-[#0d0d11]/90 px-3 py-2 text-[11px] text-slate-300 shadow-xl backdrop-blur">
					<p class="font-semibold text-white">One set of keys</p>
					<p class="text-[10px] text-slate-500">Connector Vault → every engine</p>
				</div>
			</div>
		</div>
	</section>

	<section class="marketing-wrap py-14 sm:py-16" aria-label="Product highlights">
		<PromoSlider />
	</section>

	<section id="story" class="border-y border-white/8 bg-[#070708] py-16 sm:py-24" aria-labelledby="story-title">
		<div class="marketing-wrap">
			<div class="max-w-2xl">
				<p class="eyebrow">The arc</p>
				<h2 id="story-title" class="section-title mt-3 text-white">From scattered tabs to a single, guided workspace.</h2>
				<p class="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">Six stages, one continuous story: the friction of fragmented tools, the moment it consolidates, and the work that finally moves.</p>
			</div>

			<div class="mt-12 space-y-14 sm:space-y-20">
				{#each STORY as stage, i (stage.step)}
					<article class="grid items-center gap-8 lg:grid-cols-2 lg:gap-14" aria-labelledby={`story-${stage.step}`}>
						<div class={i % 2 === 1 ? "lg:order-2" : ""}>
							<picture>
								<source type="image/webp" srcset={`/images/responsive/${stage.image}-640.webp 640w, /images/responsive/${stage.image}-1024.webp 1024w, /images/generated/${stage.image}.webp 1536w`} sizes="(max-width: 1024px) 100vw, 560px" />
								<img
									src={`/images/generated/${stage.image}.webp`}
									alt={stage.alt}
									width="1536"
									height="864"
									loading="lazy"
									decoding="async"
									class="aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover"
								/>
							</picture>
						</div>
						<div class={i % 2 === 1 ? "lg:order-1" : ""}>
							<p class="font-mono text-[11px] tracking-[0.3em] text-indigo-400">STAGE {stage.step}</p>
							<h3 id={`story-${stage.step}`} class="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">{stage.title}</h3>
							<p class="mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">{stage.copy}</p>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section id="features" class="py-16 sm:py-24" aria-labelledby="features-title">
		<div class="marketing-wrap">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div class="max-w-2xl">
					<p class="eyebrow">Craft</p>
					<h2 id="features-title" class="section-title mt-3 text-white">Depth where it matters.</h2>
				</div>
				<a href="/home" class="text-sm text-indigo-300 transition hover:text-indigo-200">Explore all modules →</a>
			</div>
			<div class="mt-10 grid gap-5 md:grid-cols-3">
				{#each FEATURES as feature (feature.title)}
					<article class="guru-card guru-card-hover overflow-hidden">
						<img
							src={`/images/generated/${feature.image}.webp`}
							srcset={`/images/responsive/${feature.image}-640.webp 640w, /images/responsive/${feature.image}-1024.webp 1024w, /images/generated/${feature.image}.webp 1536w`}
							sizes="(max-width: 768px) 100vw, 380px"
							alt={feature.alt}
							width="1536"
							height="864"
							loading="lazy"
							decoding="async"
							class="aspect-[16/10] w-full object-cover"
						/>
						<div class="p-5">
							<h3 class="text-base font-semibold text-white">{feature.title}</h3>
							<p class="mt-2 text-sm leading-relaxed text-slate-400">{feature.copy}</p>
							<a href={feature.href} class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200">Open module <span aria-hidden="true">→</span></a>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section id="modules" class="border-y border-white/8 bg-[#070708] py-16 sm:py-20" aria-labelledby="modules-title">
		<div class="marketing-wrap">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="eyebrow">The collection</p>
					<h2 id="modules-title" class="section-title mt-3 text-white">Eighteen modules. One grammar.</h2>
				</div>
				<p class="max-w-sm text-sm text-slate-400">Every module shares the same prompts, keys, navigation and audit trail — so switching tools never means starting over.</p>
			</div>
			<ul class="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each modules as item (item.href)}
					<li>
						<a href={item.href} class="group flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition hover:border-indigo-400/40 hover:bg-white/[0.05]">
							<span class="mt-0.5 text-base text-indigo-300" aria-hidden="true">{item.icon}</span>
							<span>
								<span class="block text-sm font-medium text-slate-200 group-hover:text-white">{item.label}</span>
								<span class="block text-[11px] leading-relaxed text-slate-500">{item.blurb}</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section id="trust" class="py-16 sm:py-24" aria-labelledby="trust-title">
		<div class="marketing-wrap">
			<div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
				<div>
					<p class="eyebrow">Governance</p>
					<h2 id="trust-title" class="section-title mt-3 text-white">Built to be trusted by a team.</h2>
					<p class="mt-4 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">Guru AI ships with role-based access control, a reviewed announcement queue and an audit trail — not as an afterthought, but as the shape of the workspace.</p>
					<div class="mt-6 flex flex-wrap gap-2">
						<a href="/roles" class="guru-btn guru-btn-ghost">Roles &amp; permissions</a>
						<a href="/subscription" class="guru-btn guru-btn-ghost">Plans &amp; entitlements</a>
					</div>
				</div>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each [{ title: "Role-based access", copy: "Member, Manager and Admin roles with granular permissions and reviewed elevation requests." }, { title: "Audited decisions", copy: "Role changes, plan grants, announcements and account actions are recorded with actor and reason." }, { title: "Private support", copy: "Members message the team in their own threads; nothing is exposed to other accounts." }, { title: "Owned credentials", copy: "Keys live in the Connector Vault; the Reverse API Lab can discover them in your own repositories." }] as item (item.title)}
						<li class="guru-card p-4">
							<h3 class="text-sm font-semibold text-white">{item.title}</h3>
							<p class="mt-1.5 text-xs leading-relaxed text-slate-400">{item.copy}</p>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<section class="marketing-wrap pb-20" aria-label="Get started">
		<div class="relative overflow-hidden rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/[0.16] via-[#0c0c11] to-cyan-500/[0.08] px-6 py-12 text-center sm:px-12">
			<p class="eyebrow">Start here</p>
			<h2 class="section-title mx-auto mt-3 max-w-xl text-white">Bring your tools together this afternoon.</h2>
			<p class="mx-auto mt-3 max-w-lg text-sm text-slate-400">Create an account, connect one engine, and the rest of the workspace is already waiting.</p>
			<div class="mt-7 flex flex-wrap justify-center gap-3">
				<a href="/login" class="guru-btn guru-btn-primary !px-5 !py-3">Create your account</a>
				<a href="/home" class="guru-btn guru-btn-ghost !px-5 !py-3">Explore the demo</a>
			</div>
		</div>
	</section>

	<footer class="border-t border-white/8 bg-[#070708] py-10">
		<div class="marketing-wrap flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
			<div class="max-w-xs">
				<div class="flex items-center gap-2.5">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">G</span>
					<span class="text-sm font-bold text-white">Guru <span class="guru-gradient-text">AI</span></span>
				</div>
				<p class="mt-3 text-xs leading-relaxed text-slate-500">The harmonized enterprise AI workspace. Built with SvelteKit, Convex and Cloudflare.</p>
			</div>
			<nav class="grid grid-cols-2 gap-x-12 gap-y-2 text-xs text-slate-400 sm:grid-cols-3" aria-label="Footer">
				<a class="hover:text-white" href="/home">Dashboard</a>
				<a class="hover:text-white" href="/chat">Chat</a>
				<a class="hover:text-white" href="/images">Image Studio</a>
				<a class="hover:text-white" href="/keywords">Keywords</a>
				<a class="hover:text-white" href="/agents">Agents</a>
				<a class="hover:text-white" href="/settings">Settings</a>
				<a class="hover:text-white" href="/login">Sign in</a>
				<a class="hover:text-white" href="/roles">Roles</a>
				<a class="hover:text-white" href="/admin">Admin</a>
			</nav>
		</div>
		<div class="marketing-wrap mt-8 flex flex-col gap-2 border-t border-white/8 pt-5 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
			<p>© {new Date().getFullYear()} Guru AI. All rights reserved.</p>
			<p>SvelteKit · Convex · Cloudflare Pages · Installable PWA</p>
		</div>
	</footer>
</div>