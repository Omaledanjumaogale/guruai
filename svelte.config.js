import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// The app is a client-rendered SPA; anchors such as the skip link are
		// resolved after hydration, so a missing static id is not a build error.
		prerender: { handleMissingId: "warn" },
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "index.html",
			strict: false
		})
	}
};

export default config;
