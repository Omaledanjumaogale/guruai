/* Guru AI service worker — offline shell only.
 *
 * Navigations are network-first; the cached shell (or /offline.html) is used only
 * when the device is offline. Build assets are content-hashed and cached at the
 * edge, so the worker deliberately never intercepts them.
 */
const CACHE = "guru-ai-v4";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET" || request.mode !== "navigate") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		fetch(request, { cache: "no-store" })
			.then((response) => {
				if (response.ok && (response.headers.get("content-type") ?? "").includes("text/html")) {
					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put("/", copy));
				}
				return response;
			})
			.catch(async () => (await caches.match(request)) || (await caches.match("/")) || (await caches.match("/offline.html")) || Response.error())
	);
});