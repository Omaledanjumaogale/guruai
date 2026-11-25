<script lang="ts">
	import GeneratorStudio from "$lib/components/GeneratorStudio.svelte";
</script>

<GeneratorStudio
	kind="music"
	title="Music Studio"
	blurb="Text-to-music generation, harmonized from deepai.org/music. Connect a music-capable key in the Connector Vault."
	engine="music"
	placeholder="e.g. calm lo-fi track with soft piano and rain, for focus"
	styles={["lo-fi", "orchestral", "electronic", "ambient", "jazz", "cinematic", "corporate upbeat", "acoustic"]}
/>
