<script lang="ts">
	let { name = "default", size = 16, strokeWidth = 1.7 }: { name?: string; size?: number; strokeWidth?: number } = $props();

	let key = $derived(name.replace(/^\//, ""));

	const paths: Record<string, string> = {
		home: '<path d="M3.5 10.4 12 3.7l8.5 6.7V20a1 1 0 0 1-1 1h-4.6v-6H9.1v6H4.5a1 1 0 0 1-1-1z"/>',
		chat: '<path d="M20.5 11.4a7.8 7.8 0 0 1-8.2 7.7 9 9 0 0 1-3.1-.6L4.5 20l1-4.1a7.7 7.7 0 1 1 15-4.5Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
		images: '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.4"/><circle cx="8.5" cy="9.4" r="1.5"/><path d="m4.5 17 4.6-4.4 3.4 3.1 3.4-3.7 3.6 4"/>',
		video: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.3"/><path d="m10.4 9.1 4.4 2.9-4.4 2.9z"/>',
		music: '<path d="M9 18V6.6l10-2.1v11.1"/><circle cx="6.5" cy="18.2" r="2.5"/><circle cx="16.5" cy="15.8" r="2.5"/>',
		visuals: '<rect x="3.2" y="3.4" width="6.4" height="5.4" rx="1.4"/><rect x="14.4" y="3.4" width="6.4" height="5.4" rx="1.4"/><rect x="8.8" y="15.2" width="6.4" height="5.4" rx="1.4"/><path d="M6.4 8.8v2.4h11.2V8.8M12 11.2v4"/>',
		humanizer: '<path d="m4 20 4.2-1.1L20 7.1a2 2 0 0 0-2.8-2.8L5.4 16.1z"/><path d="m14.8 6.7 2.7 2.7M4 20h5"/>',
		tools: '<path d="M14.7 6.2a4.2 4.2 0 0 0-5.4 5.3L4 16.8a2 2 0 1 0 2.8 2.8l5.3-5.3a4.2 4.2 0 0 0 5.3-5.4l-2.9 2.8-2.6-2.6z"/>',
		convert: '<path d="M4 7.5h13.5M14.4 4.5l3 3-3 3M20 16.5H6.5M9.6 13.5l-3 3 3 3"/>',
		keywords: '<circle cx="10.6" cy="10.6" r="6.3"/><path d="m15.4 15.4 4.7 4.7"/>',
		transcript: '<path d="M5 4.2h11l3 3v12.6H5z"/><path d="M8.2 9h7.6M8.2 12.6h7.6M8.2 16.2h4.8"/>',
		notes: '<path d="M5 4.5h9.5L20 10v9.5H5z"/><path d="M14.2 4.5V10H20M8.2 13.2h7.6M8.2 16.2h5.2"/>',
		agents: '<circle cx="12" cy="5.2" r="2.2"/><circle cx="5" cy="17.4" r="2.2"/><circle cx="19" cy="17.4" r="2.2"/><path d="m10.8 7.2-4 8.2M13.2 7.2l4 8.2M7.2 17.4h9.6"/>',
		"reverse-api": '<path d="m8.5 7.5-4 4.5 4 4.5M15.5 7.5l4 4.5-4 4.5M13.2 4.5l-2.4 15"/>',
		connectors: '<path d="M9 3.5v5M15 3.5v5M7 8.5h10v2.2a5 5 0 0 1-10 0zM12 15.7v4.8"/>',
		models: '<path d="m12 3 8.5 4.7L12 12.4 3.5 7.7z"/><path d="m4 12 8 4.4 8-4.4M4 16.2l8 4.4 8-4.4"/>',
		settings: '<path d="M4 7h7M15 7h5M4 17h5M13 17h7"/><circle cx="13" cy="7" r="2"/><circle cx="11" cy="17" r="2"/>',
		profile: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
		roles: '<path d="M12 3.2 20 6v5.3c0 4.6-3.3 7.7-8 9.5-4.7-1.8-8-4.9-8-9.5V6z"/><path d="m8.7 11.8 2.2 2.2 4.4-4.4"/>',
		subscription: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.4"/><path d="M3 9.6h18M7 14h4"/>',
		hub: '<circle cx="12" cy="12" r="8.6"/><path d="M3.6 9.5h16.8M3.6 14.5h16.8M12 3.4c2.4 2.4 3.7 5.4 3.7 8.6S14.4 18.2 12 20.6c-2.4-2.4-3.7-5.4-3.7-8.6S9.6 5.8 12 3.4Z"/>',
		team: '<circle cx="9" cy="8.3" r="3.2"/><path d="M3.5 19.4a5.5 5.5 0 0 1 11 0M16 5.4a3.2 3.2 0 0 1 0 5.9M17.2 14.2a5.2 5.2 0 0 1 3.3 4.8"/>',
		activity: '<path d="M3 12h4l2.4-6 4.2 12 2.4-6h5"/>',
		security: '<rect x="4.2" y="10" width="15.6" height="10.2" rx="2.2"/><path d="M7.8 10V7.5a4.2 4.2 0 0 1 8.4 0V10M12 14.2v2.3"/>',
		analytics: '<path d="M4 20V4M4 20h16"/><rect x="7.4" y="11" width="2.8" height="6"/><rect x="12" y="7.5" width="2.8" height="9.5"/><rect x="16.6" y="13.5" width="2.8" height="3.5"/>',
		inbox: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.2"/><path d="m3.8 7 8.2 6 8.2-6"/>',
		notifications: '<path d="M18 9.2a6 6 0 0 0-12 0c0 6-2.2 7.6-2.2 7.6h16.4S18 15.2 18 9.2ZM9.8 20a2.5 2.5 0 0 0 4.4 0"/>',
		admin: '<path d="m12 3.3 2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z"/>',
		search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.6 15.6 4.4 4.4"/>',
		lock: '<rect x="4.5" y="10" width="15" height="10.4" rx="2.2"/><path d="M8 10V7.4a4 4 0 0 1 8 0V10"/>',
		check: '<path d="m4.5 12.5 4.6 4.6L19.5 6.5"/>',
		close: '<path d="m6 6 12 12M18 6 6 18"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		send: '<path d="m21 3-9.6 18-2.7-7.7L1 10.6z"/><path d="M21 3 8.7 13.3"/>',
		download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"/>',
		spark: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 15.5 19 18l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>',
		default: '<circle cx="12" cy="12" r="8"/>'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="shrink-0"
>
	{@html paths[key] ?? paths.default}
</svg>
