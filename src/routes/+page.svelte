<script lang="ts">
	import PromoSlider from "$lib/components/PromoSlider.svelte";
	import Logo from "$lib/components/Logo.svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import Icon from "$lib/components/Icon.svelte";
	import { SLIDES, STORY, FEATURES, TRUST } from "$lib/brand";
	import { NAV } from "$lib/nav";
	import { account } from "$lib/auth";

	const modules = NAV.filter((n) => !["/home", "/inbox", "/notifications", "/roles", "/subscription", "/admin", "/profile"].includes(n.href));
	const ecosystem = ["DeepAI", "WriteHuman", "Napkin", "Monica", "FreeConvert", "Not Diamond", "Lindy", "E-WIN Hub"];

	const previewRows = [
		{ icon: "chat", title: "Strategy brief", meta: "GuruRoute · agnes-2.5-pro", state: "Complete" },
		{ icon: "images", title: "Launch visual", meta: "Image Studio · 1536 × 1024", state: "Complete" },
		{ icon: "humanizer", title: "Founder note", meta: "Humanizer · natural voice", state: "Complete" }
	];
</script>

<svelte:head>
	<meta name="description" content="Guru AI is the E-WIN ecosystem's enterprise AI workspace: chat, image, video, music, diagrams, humanizer, keywords, transcripts, conversion, notes and agents — with role-based access, E-WIN identity and an audit trail." />
</svelte:head>

<div class="min-h-screen bg-[var(--page)] text-[var(--ink)]">
	<header class="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--page-2)] backdrop-blur-xl">
		<div class="marketing-wrap flex h-[66px] items-center justify-between gap-5">
			<a href="/" aria-label="Guru AI home"><Logo size={33} tagline="Enterprise AI" /></a>
			<nav class="hidden items-center gap-6 text-[12.5px] font-medium text-[var(--muted)] md:flex" aria-label="Product sections">
				<a class="transition hover:text-[var(--ink)]" href="#story">Story</a>
				<a class="transition hover:text-[var(--ink)]" href="#features">Platform</a>
				<a class="transition hover:text-[var(--ink)]" href="#modules">Modules</a>
				<a class="transition hover:text-[var(--ink)]" href="#trust">Governance</a>
			</nav>
			<div class="flex items-center gap-2.5">
				<ThemeToggle />
				{#if $account}
					<a href="/home" class="guru-btn guru-btn-primary !py-2 !text-[12.5px]">Open workspace <span aria-hidden="true">→</span></a>
				{:else}
					<a href="/login" class="hidden text-[12.5px] font-semibold text-[var(--ink-soft)] transition hover:text-[var(--accent)] sm:block">Sign in</a>
					<a href="/login" class="guru-btn guru-btn-primary !py-2 !text-[12.5px]">Get started</a>
				{/if}
			</div>
		</div>
	</header>

	<section class="relative isolate overflow-hidden" aria-labelledby="hero-title">
		<div
			class="pointer-events-none absolute inset-0 opacity-50"
			style="background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 64px 64px; mask-image: radial-gradient(ellipse 85% 70% at 50% 35%, black 20%, transparent 78%);"
		></div>
		<div class="pointer-events-none absolute -right-40 -top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(232,66,79,0.22),transparent_65%)] blur-2xl"></div>
		<div class="pointer-events-none absolute -left-32 top-72 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16),transparent_65%)] blur-2xl"></div>

		<div class="marketing-wrap relative grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-24">
			<div class="rise">
				<p class="guru-chip guru-chip-accent">
					<span class="h-1.5 w-1.5 rounded-full bg-[var(--green)]"></span>
					E-WIN ecosystem · Enterprise AI
				</p>
				<h1 id="hero-title" class="display mt-6 max-w-[720px]">
					Every tool your team needs.<br />
					<span class="italic text-[var(--accent)]">One intelligent workspace.</span>
				</h1>
				<p class="mt-6 max-w-xl text-[15px] leading-[1.75] text-[var(--muted)] sm:text-[16.5px]">
					Chat, imagery, video, music, diagrams, research, transcripts and agents — harmonised under one identity, one design language and one audit trail. Built for teams that ship.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-3">
					<a href="/login" class="guru-btn guru-btn-primary !px-5 !py-3">Create your workspace <span aria-hidden="true">→</span></a>
					<a href="#story" class="guru-btn guru-btn-ghost !px-5 !py-3">See how it works</a>
				</div>
				<dl class="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--line)] pt-6 sm:grid-cols-4">
					{#each TRUST as stat (stat.label)}
						<div>
							<dt class="sr-only">{stat.label}</dt>
							<dd class="font-display text-[27px] leading-none text-[var(--ink)]">{stat.value}</dd>
							<dd class="mt-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{stat.label}</dd>
						</div>
					{/each}
				</dl>
			</div>

			<div class="relative hidden lg:block" aria-hidden="true">
				<div class="absolute inset-8 rounded-[40px] bg-[radial-gradient(circle_at_30%_20%,rgba(232,66,79,0.22),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.2),transparent_55%)] blur-2xl"></div>
				<div class="guru-card relative ml-auto w-full max-w-[430px] overflow-hidden !rounded-[22px] p-4 shadow-[0_36px_90px_rgba(0,0,0,0.45)]">
					<div class="flex items-center justify-between border-b border-[var(--line)] pb-3">
						<div class="flex items-center gap-2">
							<span class="flex gap-1"><span class="h-2 w-2 rounded-full bg-[var(--accent)]"></span><span class="h-2 w-2 rounded-full bg-[var(--amber-guru)]"></span><span class="h-2 w-2 rounded-full bg-[var(--green)]"></span></span>
							<span class="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Workspace overview</span>
						</div>
						<span class="guru-chip guru-chip-green !py-0.5 !text-[8.5px]">Live</span>
					</div>
					<div class="mt-3 grid grid-cols-3 gap-2">
						{#each [{ v: "28", l: "Modules" }, { v: "1.2k", l: "Runs" }, { v: "6", l: "Members" }] as metric (metric.l)}
							<div class="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2">
								<p class="font-display text-[20px] leading-none text-[var(--ink)]">{metric.v}</p>
								<p class="mt-1 text-[8.5px] font-bold uppercase tracking-[0.13em] text-[var(--muted)]">{metric.l}</p>
							</div>
						{/each}
					</div>
					<div class="mt-3 space-y-1.5">
						{#each previewRows as row (row.title)}
							<div class="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2">
								<span class="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]"><Icon name={row.icon} size={13} /></span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-[11px] font-semibold text-[var(--ink)]">{row.title}</span>
									<span class="block truncate text-[9px] text-[var(--muted)]">{row.meta}</span>
								</span>
								<span class="text-[9px] font-semibold text-[var(--green)]">{row.state}</span>
							</div>
						{/each}
					</div>
					<div class="mt-3 flex items-center justify-between rounded-xl border border-[var(--sky-soft)] bg-[var(--sky-soft)] px-3 py-2.5">
						<span class="flex items-center gap-2">
							<Icon name="hub" size={14} />
							<span class="text-[10.5px] font-bold text-[var(--ink)]">E-WIN Hub identity</span>
						</span>
						<span class="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--green)]"><span class="h-1.5 w-1.5 rounded-full bg-[var(--green)]"></span>Verified</span>
					</div>
					<div class="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
						<span>1 workspace · one set of keys</span>
						<span class="text-[var(--accent)]">Audit on</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<div class="marketing-band py-5">
		<div class="marketing-wrap flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-center sm:justify-between">
			<p class="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Harmonised from the tools you trust</p>
			<div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
				{#each ecosystem as name (name)}<span class="text-[11px] font-semibold tracking-tight text-[var(--ink-soft)] opacity-70">{name}</span>{/each}
			</div>
		</div>
	</div>

	<section class="marketing-wrap py-12 sm:py-16" aria-label="Product highlights">
		<PromoSlider />
	</section>

	<section id="story" class="marketing-band py-16 sm:py-24" aria-labelledby="story-title">
		<div class="marketing-wrap">
			<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
				<div>
					<p class="eyebrow">The arc</p>
					<h2 id="story-title" class="section-title mt-3">From scattered tabs to a single, guided workspace.</h2>
				</div>
				<p class="max-w-lg text-[13.5px] leading-relaxed text-[var(--muted)] lg:justify-self-end">
					Six stages, one continuous story: the friction of fragmented tools, the moment it consolidates, and the work that finally moves.
				</p>
			</div>

			<div class="mt-12 space-y-12 sm:space-y-16">
				{#each STORY as stage, i (stage.step)}
					<article class="grid items-center gap-7 lg:grid-cols-2 lg:gap-14" aria-labelledby={`story-${stage.step}`}>
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
									class="aspect-[16/9] w-full rounded-2xl border border-[var(--line)] object-cover shadow-[var(--shadow)]"
								/>
							</picture>
						</div>
						<div class={i % 2 === 1 ? "lg:order-1" : ""}>
							<p class="font-mono text-[10px] tracking-[0.28em] text-[var(--accent)]">STAGE {stage.step}</p>
							<h3 id={`story-${stage.step}`} class="mt-3 text-[21px] font-bold tracking-[-0.02em] text-[var(--ink)] sm:text-[25px]">{stage.title}</h3>
							<p class="mt-3 max-w-md text-[13.5px] leading-relaxed text-[var(--muted)] sm:text-[14.5px]">{stage.copy}</p>
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
					<h2 id="features-title" class="section-title mt-3">Depth where it matters.</h2>
				</div>
				<a href="/home" class="text-[12.5px] font-semibold text-[var(--accent)] transition hover:opacity-75">Explore all modules →</a>
			</div>
			<div class="mt-10 grid gap-5 md:grid-cols-3">
				{#each FEATURES as feature (feature.title)}
					<article class="guru-card guru-card-hover overflow-hidden">
						<div class="overflow-hidden border-b border-[var(--line)]">
							<img
								src={`/images/generated/${feature.image}.webp`}
								srcset={`/images/responsive/${feature.image}-640.webp 640w, /images/responsive/${feature.image}-1024.webp 1024w, /images/generated/${feature.image}.webp 1536w`}
								sizes="(max-width: 768px) 100vw, 380px"
								alt={feature.alt}
								width="1536"
								height="864"
								loading="lazy"
								decoding="async"
								class="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.02]"
							/>
						</div>
						<div class="p-5">
							<h3 class="text-[15px] font-bold tracking-tight text-[var(--ink)]">{feature.title}</h3>
							<p class="mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]">{feature.copy}</p>
							<a href={feature.href} class="mt-4 inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--accent)] hover:opacity-75">Open module <span aria-hidden="true">→</span></a>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<section id="modules" class="marketing-band py-16 sm:py-20" aria-labelledby="modules-title">
		<div class="marketing-wrap">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="eyebrow">The collection</p>
					<h2 id="modules-title" class="section-title mt-3">{modules.length} modules. One grammar.</h2>
				</div>
				<p class="max-w-sm text-[12.5px] leading-relaxed text-[var(--muted)]">Every module shares the same prompts, keys, navigation and audit trail — so switching tools never means starting over.</p>
			</div>
			<ul class="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
				{#each modules as item (item.href)}
					<li>
						<a href={item.href} class="group flex h-full items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 transition hover:border-[var(--accent)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
							<span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]"><Icon name={item.href} size={14} /></span>
							<span class="min-w-0">
								<span class="block text-[12.5px] font-bold text-[var(--ink)]">{item.label}</span>
								<span class="mt-0.5 block text-[10.5px] leading-relaxed text-[var(--muted)]">{item.blurb}</span>
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
					<h2 id="trust-title" class="section-title mt-3">Built to be trusted by a team.</h2>
					<p class="mt-4 max-w-md text-[13.5px] leading-relaxed text-[var(--muted)]">Guru AI ships with role-based access control, a reviewed announcement queue and an audit trail — not as an afterthought, but as the shape of the workspace.</p>
					<div class="mt-6 flex flex-wrap gap-2">
						<a href="/roles" class="guru-btn guru-btn-ghost">Roles &amp; permissions</a>
						<a href="/subscription" class="guru-btn guru-btn-ghost">Plans &amp; entitlements</a>
					</div>
				</div>
				<ul class="grid gap-3 sm:grid-cols-2">
					{#each [{ icon: "security", title: "Role-based access", copy: "Member, Manager and Admin roles with granular permissions and reviewed elevation requests." }, { icon: "activity", title: "Audited decisions", copy: "Role changes, plan grants, announcements and account actions are recorded with actor and reason." }, { icon: "inbox", title: "Private support", copy: "Members message the team in their own threads; nothing is exposed to other accounts." }, { icon: "connectors", title: "Owned credentials", copy: "Keys live in the Connector Vault; the Reverse API Lab can discover them in your own repositories." }] as item (item.title)}
						<li class="guru-card p-4">
							<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon name={item.icon} size={15} /></span>
							<h3 class="mt-3 text-[13px] font-bold text-[var(--ink)]">{item.title}</h3>
							<p class="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">{item.copy}</p>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<section class="marketing-wrap pb-20" aria-label="Get started">
		<div class="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a0d] px-6 py-12 text-center sm:px-12 sm:py-16">
			<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,66,79,0.28),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(56,189,248,0.18),transparent_45%)]"></div>
			<div class="pointer-events-none absolute inset-0 opacity-[0.16]" style="background-image: linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black, transparent 72%);"></div>
			<div class="relative">
				<p class="eyebrow justify-center">Start here</p>
				<h2 class="section-title mx-auto mt-3 max-w-xl !text-white">Bring your tools together this afternoon.</h2>
				<p class="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-slate-400">Create an account with your E-WIN identity, connect one engine, and the rest of the workspace is already waiting.</p>
				<div class="mt-7 flex flex-wrap justify-center gap-3">
					<a href="/login" class="guru-btn guru-btn-primary !px-5 !py-3">Create your account</a>
					<a href="/home" class="guru-btn guru-btn-light !px-5 !py-3">Explore the workspace</a>
				</div>
			</div>
		</div>
	</section>

	<footer class="border-t border-[var(--line)] bg-[var(--page-2)] py-10">
		<div class="marketing-wrap flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
			<div class="max-w-xs">
				<Logo size={32} tagline="Enterprise AI" />
				<p class="mt-3 text-[11.5px] leading-relaxed text-[var(--muted)]">The harmonised enterprise AI workspace. Part of the E-WIN ecosystem. Built with SvelteKit, Convex and Cloudflare.</p>
				<div class="mt-3 flex items-center gap-2">
					<span class="guru-chip guru-chip-sky !py-0.5 !text-[8px]">E-WIN identity</span>
					<span class="guru-chip !py-0.5 !text-[8px]">Installable PWA</span>
				</div>
			</div>
			<nav class="grid grid-cols-2 gap-x-12 gap-y-2 text-[11.5px] text-[var(--muted)] sm:grid-cols-3" aria-label="Footer">
				<a class="hover:text-[var(--ink)]" href="/home">Dashboard</a>
				<a class="hover:text-[var(--ink)]" href="/chat">Chat</a>
				<a class="hover:text-[var(--ink)]" href="/images">Image Studio</a>
				<a class="hover:text-[var(--ink)]" href="/keywords">Keywords</a>
				<a class="hover:text-[var(--ink)]" href="/agents">Agents</a>
				<a class="hover:text-[var(--ink)]" href="/hub">E-WIN Hub</a>
				<a class="hover:text-[var(--ink)]" href="/login">Sign in</a>
				<a class="hover:text-[var(--ink)]" href="/roles">Roles</a>
				<a class="hover:text-[var(--ink)]" href="/admin">Admin</a>
			</nav>
		</div>
		<div class="marketing-wrap mt-8 flex flex-col gap-2 border-t border-[var(--line)] pt-5 text-[10px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
			<p>© {new Date().getFullYear()} Guru AI · E-WIN Project. All rights reserved.</p>
			<p class="flex items-center gap-2">SvelteKit · Convex · Cloudflare Pages <ThemeToggle /></p>
		</div>
	</footer>
</div>
