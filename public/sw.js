// Keeps images (deal backgrounds and icons, mostly hotlinked from brand sites) in a
// cache, so a repeat visit shows them without downloading again. Every other request
// goes to the network as usual.
// ponytail: cache-first with no expiry; a changed image keeps its old copy until the URL
// changes (npm run og writes a new URL) or the cap evicts it. Bump CACHE to force a refresh.
const CACHE = "images-v1";
const MAX_ENTRIES = 100;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET" || request.destination !== "image") return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(request);
			if (cached) return cached;

			const response = await fetch(request);
			// brand images are cross-origin, so they come back "opaque" (status 0) but still work
			if (response.ok || response.type === "opaque") {
				await cache.put(request, response.clone());
				trim(cache);
			}
			return response;
		}),
	);
});

// drop the oldest entries beyond MAX_ENTRIES
async function trim(cache) {
	const keys = await cache.keys();
	for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
		await cache.delete(key);
	}
}
