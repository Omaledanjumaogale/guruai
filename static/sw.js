/* Guru AI service worker — offline shell only.
 *
 * Deliberately narrow: it intercepts *navigations* and nothing else. Build
 * assets are content-hashed and served by Cloudflare's edge cache, so letting
 * the worker cache them risks pinning an HTML fallback under a script URL and
 * blanking the app. Navigation requests go to the network first and only fall
 * back to the cached shell when the device is offline.
 */
const CACHE = "guru-ai-v3";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	if (request.mode !== "navigate") return; // assets: straight to the network

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		fetch(request, { cache: "no-store" })
			.then((res) => {
				// Only a real document is worth caching; fallback HTML served for a
				// missing asset must never be stored.
				if (res.ok && (res.headers.get("content-type") ?? "").includes("text/html")) {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put("/", copy));
				}
				return res;
			})
			.catch(async () => (await caches.match("/")) || Response.error())
	);
});
