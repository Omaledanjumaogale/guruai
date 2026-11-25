<script lang="ts">
	let { text } = $props();
	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			/* clipboard blocked */
		}
	}
</script>

<button class="guru-btn guru-btn-ghost !px-2.5 !py-1 text-xs" onclick={copy} title="Copy to clipboard">
	{copied ? "✔ Copied" : "Copy"}
</button>
