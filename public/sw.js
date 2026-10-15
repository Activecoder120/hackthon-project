const CACHE = "ait-campus-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      const response = await fetch("/index.html");
      const html = await response.text();
      const assets = [
        ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
      ].map((m) => m[1]);
      await c.addAll([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icon.svg",
        ...assets,
      ]);
    })(),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((c) => c.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return (await caches.match("/index.html")) || Response.error();
        return Response.error();
      }),
  );
});
