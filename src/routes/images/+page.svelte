<script lang="ts">
	import GeneratorStudio from "$lib/components/GeneratorStudio.svelte";
	import BrandBanner from "$lib/components/BrandBanner.svelte";
</script>

<BrandBanner name="images" />

<GeneratorStudio
	kind="image"
	title="Image Studio"
	blurb="Text-to-image generation powered by the DeepAI engine, harmonized from deepai.org/machine-learning-model/text2img."
	engine="deepai"
	placeholder="e.g. a neon-lit enterprise data center with holographic dashboards"
	styles={["photorealistic", "cyberpunk", "oil painting", "watercolor", "3d render", "anime", "minimalist", "pixel art"]}
/>