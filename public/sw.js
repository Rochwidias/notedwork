/* notedwork service worker — app shell agar online & tahan refresh.
   Navigasi (HTML): network-first — selalu ambil HTML terbaru dari server,
   fallback ke cache hanya saat offline. HTML basi menunjuk aset _next hash
   lama yang sudah 404 → halaman tampil polos tanpa CSS setelah deploy.
   Aset statis (_next/static, font, ikon): stale-while-revalidate. */
const CACHE = "notedwork-v3";
const CORE = ["/", "/icon.svg"];

self.addEventListener("install", (e) => {
  // allSettled: satu aset gagal (404/offline) tak boleh menggagalkan install.
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // jangan cache Google Fonts dkk

  // Navigasi: network-first agar HTML tak pernah basi.
  if (isNavigation(request)) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match("/")))
    );
    return;
  }

  // Aset: stale-while-revalidate — sajikan cache langsung, refresh di background.
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      const go = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || go;
    })
  );
});
