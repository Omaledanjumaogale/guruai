<script lang="ts">
	let {
		size = 36,
		wordmark = true,
		tagline = "Enterprise workspace",
		compact = false
	}: { size?: number; wordmark?: boolean; tagline?: string; compact?: boolean } = $props();
</script>

<span class="inline-flex min-w-0 items-center gap-2.5">
	<svg
		width={size}
		height={size}
		viewBox="0 0 48 48"
		role="img"
		aria-label="Guru AI"
		class="shrink-0"
	>
		<rect x="1" y="1" width="46" height="46" rx="14" fill="#08080b" stroke="rgba(255,255,255,0.14)" />
		<circle
			cx="24"
			cy="24"
			r="14.5"
			fill="none"
			stroke="#e8424f"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-dasharray="67 25"
			transform="rotate(-112 24 24)"
		/>
		<path d="M30.6 17.7a9.6 9.6 0 1 0 1.4 10.2" fill="none" stroke="#ffffff" stroke-width="3.3" stroke-linecap="round" />
		<path d="M26.2 24h6.6" fill="none" stroke="#ffffff" stroke-width="3.1" stroke-linecap="round" />
		<ellipse
			cx="24"
			cy="24"
			rx="21"
			ry="8.2"
			fill="none"
			stroke="#38bdf8"
			stroke-width="1.25"
			opacity="0.9"
			transform="rotate(-28 24 24)"
		/>
		<circle cx="40.2" cy="14.6" r="2.5" fill="#2dd4a0" stroke="#08080b" stroke-width="1" />
	</svg>
	{#if wordmark}
		<span class="min-w-0">
			<span class="logo-word block" style={compact ? "font-size: 16px" : "font-size: 19px"}>Guru <em>AI</em></span>
			{#if tagline}
				<span class="logo-tag mt-0.5 block truncate">{tagline}</span>
			{/if}
		</span>
	{/if}
</span>
