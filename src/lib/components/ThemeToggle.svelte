<script lang="ts">
	import { theme, toggleTheme } from "../theme";

	let dark = $derived($theme === "dark");
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
	title={dark ? "Light theme" : "Dark theme"}
>
	{#if dark}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
			<circle cx="12" cy="12" r="4.2" />
			<path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
		</svg>
	{:else}
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M20.5 14.4A8.6 8.6 0 0 1 9.6 3.5 8.7 8.7 0 1 0 20.5 14.4Z" />
		</svg>
	{/if}
</button>
