/* Build estático verificado. No almacena proyectos ni peticiones de otros sitios. */
const FILES = [{"path":"app-icon.svg","sha256":"5b94fda7650709d3f5abf21e157fb321ae3e0e9e12aadb6435633122d36931a4"},{"path":"assets/Scene-DI-t73Em.js","sha256":"4ecdef069b11285fccd4dd14b238b6d76ba42d41c82a3806be00be683e1429c3"},{"path":"assets/dm-sans-latin-400-normal-BwCSEQnW.woff","sha256":"38702875fe179437d200e7ba6f7fab4d497ffe48117ef332029b2081751186ad"},{"path":"assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","sha256":"4ab51eb2cd7305d177187908d6397474d4520663f6c6e572feb0a64f4fa80006"},{"path":"assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","sha256":"19bf1984956517c35c2bd35b6cdedac12a21d6fcd3596c614ecdfb88b648909d"},{"path":"assets/dm-sans-latin-500-normal-Dr3UlScf.woff","sha256":"7deb957e430b780ee3272d801af4f9f2211b1330ec40a312a8f25309eacb4034"},{"path":"assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","sha256":"6bb2b2645ba5eeaecf56322c543fa3a75b87b927977b9c03b1dabc4205089120"},{"path":"assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","sha256":"e7351257e49400eff05aca30a2007289194a900860d30c30770d8b8732897564"},{"path":"assets/dm-sans-latin-700-normal-CUSSCpQX.woff","sha256":"af422a448ac00679a8dbb13532db3616829c5a35b58d3eeea5903ce17ad2e36a"},{"path":"assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","sha256":"35c5efa0e5daa52ee5c6500f5be354bf751fb65c4e49e1d6806c6eb5883e8fe9"},{"path":"assets/exceljs.min-DcWjSGxA.js","sha256":"ed3e9de72aba3bfae4efb469ddc81ec51515bf571a7f6a1fe99501f0963aedf0"},{"path":"assets/export-C2AHvj01.js","sha256":"53e39da9876961a7a9945d34df77e9dde2f1d151aa8203a590dfda25a21bb842"},{"path":"assets/html2canvas.esm-DXEQVQnt.js","sha256":"7b07a9ca175c614e8e7de447198d35b0d161dd50db2c63b5f7fd6ea0e1e876f2"},{"path":"assets/index-B_dEhtAJ.css","sha256":"63678858c71069890258a2252f0c12b4bdd46c24752701380d0421c8680236b2"},{"path":"assets/index-CJXK9WOL.js","sha256":"5f3914a022b5f3e29b16e2d57fd7b0092c07cf010cc9c1aa8194b7293ee2caae"},{"path":"assets/index-nWnr4-hn.js","sha256":"aa225fb4fe4259a6d892cfdcfbfac52c82d5e4862652672f19991bde2612541f"},{"path":"assets/index.es-M1yzAg6K.js","sha256":"74c02cc43a81e19a82b1670d9ea7dd693c354e9ad674a5700cf67a175034cf53"},{"path":"assets/jspdf.es.min-nTgbwPEv.js","sha256":"4ff9ea4232cb476c96b95b903d9a1c26e9a40a8fa027c7f9854a71f96c062a47"},{"path":"assets/jspdf.plugin.autotable-DSC45M_K.js","sha256":"cf136bc3222367f1280eae9614271951c7e26db26e5ce6506e807419b2206600"},{"path":"assets/manrope-latin-500-normal-BYYD-dBL.woff2","sha256":"19874318747181a650eda439c37955220b849d9c4797c9e0718ee67d4bf929bc"},{"path":"assets/manrope-latin-500-normal-DMZssgOp.woff","sha256":"c805ac8fd73fb95ddba74e624500c7d7d9a8ec6434d723bb6a9b76173c9e41b4"},{"path":"assets/manrope-latin-600-normal-4f0koTD-.woff2","sha256":"f7ac6258da20ab7541939b59851155753d1d24f1b30cbcb949077a3faa3d1593"},{"path":"assets/manrope-latin-600-normal-BqgrALkZ.woff","sha256":"8d1f509774bca963fa02faf674678ce9244474306361ca2798583fa600346df6"},{"path":"assets/manrope-latin-700-normal-BZp_XxE4.woff2","sha256":"d2a12c85a831e4b5db341767d0347fa3d1361d22a1fcb3e361a16b6c90080f71"},{"path":"assets/manrope-latin-700-normal-DGRFkw-m.woff","sha256":"e5d35fda4759b0d63ebcc6cca0627d98d9208254ce851c85df29e4d12aeafb61"},{"path":"assets/manrope-latin-800-normal-BfWYOv1c.woff2","sha256":"74c161dbcbce7c3590803cc72dc1f63313c360e13367aba5075a7b7b3818ea49"},{"path":"assets/manrope-latin-800-normal-uHUdIJgA.woff","sha256":"ce954acb78379d559111a15d29925f3390b69161b2b1365c38b0f19c76991bac"},{"path":"assets/purify.es-18JuyMri.js","sha256":"d20e7581818a4ef09a7a0e1bc84597c51fa253aea2b5b55935d5d7809793a28d"},{"path":"icon-192.png","sha256":"b969d3650e2c8c66be9d1c82fd3639df32e5f839123d6f3b220501f7ac49484f"},{"path":"icon-512.png","sha256":"8841c0e70bf2b7f8be547dc312c7dd06458081c14110125b99580a4c9e7e3d29"},{"path":"index.html","sha256":"4c767a0c4b63e8b32fbf08bc9c260cc258cdc00a138e2b00d3565314c2fca22a"},{"path":"manifest.webmanifest","sha256":"3fdd9b462752079ff28fc0a04fb3c8b5b1b338dcf5f00425af1c09cbde04dc7d"}];
const REVISION = "a0eddfb910c63c4c3d8f";
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
