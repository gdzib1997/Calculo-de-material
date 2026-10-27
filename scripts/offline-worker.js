/* Build estático verificado. No almacena proyectos ni peticiones de otros sitios. */
const FILES = __PRECACHE__;
const REVISION = __REVISION__;
const ROOT = new URL(self.registration.scope);
const PREFIX = `unirack-studio:${ROOT.pathname}:`;
const CACHE = PREFIX + REVISION;
const urls = new Map(FILES.map((f) => [new URL(f.path, ROOT).href, f.sha256]));
const mainByClient = new Map();
const indexUrl = new URL("index.html", ROOT).href;
const generationUrl = new URL(".offline-cache-version", ROOT).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await Promise.all(
          [...urls].map(async ([url, expected]) => {
            const response = await fetch(
              new Request(url, { cache: "reload", credentials: "same-origin" }),
            );
            if (!response.ok || response.redirected)
              throw new Error("No se pudo preparar el uso sin conexión.");
            const digest = await crypto.subtle.digest(
              "SHA-256",
              await response.clone().arrayBuffer(),
            );
            const actual = [...new Uint8Array(digest)]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            if (actual !== expected)
              throw new Error("La actualización todavía no está completa.");
            await cache.put(url, response);
          }),
        );
        const generations = await Promise.all(
          (await caches.keys())
            .filter((n) => n.startsWith(PREFIX))
            .map(async (n) => {
              const data = await (await caches.open(n)).match(generationUrl);
              return data ? Number((await data.json()).generation) || 0 : 0;
            }),
        );
        await cache.put(
          generationUrl,
          new Response(
            JSON.stringify({ generation: Math.max(0, ...generations) + 1 }),
          ),
        );
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Conserva las versiones que sigan usando otras ventanas. Ante una ventana
// desconocida o un reinicio del worker, no elimina sus recursos.
async function cleanUnusedVersions() {
  if (self.registration.installing || self.registration.waiting) return;
  const own = await (await caches.open(CACHE)).match(generationUrl);
  if (!own) return;
  const generation = Number((await own.json()).generation);
  const windows = (
    await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  ).filter((c) => c.url.startsWith(ROOT.href));
  if (!windows.length || windows.some((c) => !mainByClient.has(c.id))) return;
  const names = (await caches.keys()).filter(
    (n) => n.startsWith(PREFIX) && n !== CACHE,
  );
  for (const name of names) {
    const cache = await caches.open(name);
    const record = await cache.match(generationUrl);
    if (!record || Number((await record.json()).generation) >= generation)
      continue;
    const inUse = await Promise.all(
      windows.map((c) => cache.match(mainByClient.get(c.id))),
    );
    if (!inUse.some(Boolean)) await caches.delete(name);
  }
}
self.addEventListener("message", (event) => {
  event.waitUntil(
    (async () => {
      if (event.data?.type === "ACTIVATE_UPDATE") {
        await self.skipWaiting();
        return;
      }
      if (event.data?.type !== "OFFLINE_STATUS") return;
      const main = event.data.mainAsset;
      if (event.source?.id && typeof main === "string")
        mainByClient.set(event.source.id, main);
      const cache = await caches.open(CACHE),
        keys = new Set((await cache.keys()).map((r) => r.url));
      event.ports[0]?.postMessage({
        ready: [...urls.keys()].every((url) => keys.has(url)),
        compatible: urls.has(main),
        revision: REVISION,
      });
      await cleanUnusedVersions();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== ROOT.origin ||
    !url.pathname.startsWith(ROOT.pathname)
  )
    return;
  if (
    request.mode === "navigate" &&
    (url.pathname === ROOT.pathname ||
      url.pathname === new URL(indexUrl).pathname)
  ) {
    event.respondWith(
      (async () =>
        (await caches.open(CACHE))
          .match(indexUrl)
          .then((r) => r || fetch(request)))(),
    );
    return;
  }
  url.search = "";
  url.hash = "";
  if (urls.has(url.href)) {
    event.respondWith(
      (async () =>
        (await caches.open(CACHE))
          .match(url.href)
          .then((r) => r || fetch(request)))(),
    );
  } else if (url.pathname.startsWith(new URL("assets/", ROOT).pathname)) {
    event.respondWith(
      (async () => {
        for (const name of (await caches.keys()).filter((n) =>
          n.startsWith(PREFIX),
        )) {
          const found = await (await caches.open(name)).match(url.href);
          if (found) return found;
        }
        return fetch(request);
      })(),
    );
  }
});
