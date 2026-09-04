const CACHE_NAME = "rower-logger-v16";
const SHELL_FILES = [
  "./index.html",
  "./app.js",
  "./nav.js",
  "./analiza.html",
  "./wyniki.html",
  "./wyniki.js",
  "./ustawienia.html",
  "./ustawienia.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategia "najpierw sieć": zawsze próbuje pobrać świeżą wersję, a cache
// to tylko rezerwa na wypadek braku internetu (i tak potrzebnego do
// Bluetooth/Sheets, więc offline i tak niewiele tu zdziała). Dzięki temu
// aktualizacje plików na GitHubie są widoczne od razu, bez konieczności
// ręcznego czyszczenia pamięci podręcznej przy każdej zmianie.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
