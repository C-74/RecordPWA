// sw.js — Service Worker pour Enregistreur audio PWA
// Basé sur le cheatsheet du cours et td8-pwa-notes

const CACHE_NAME = "record-pwa-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
  "https://cdn.jsdelivr.net/npm/idb@7/build/umd.js"
];

// ---------------------------------------------------------------------------
// 1. Install : mise en cache de l'App Shell
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  console.log(`[SW] Install : mise en cache de ${STATIC_ASSETS.length} fichiers`);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => console.log(`[SW] Cache « ${CACHE_NAME} » initialisé avec succès`))
  );
});

// ---------------------------------------------------------------------------
// 2. Activate : nettoyage des anciens caches + prise de contrôle immédiate
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate : nettoyage des anciens caches");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => {
            console.log(`[SW] Suppression ancien cache : ${k}`);
            return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// 3. Message : gestion du Skip Waiting déclenché par la bannière de mise à jour
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Message SKIP_WAITING reçu, activation immédiate");
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// 4. Fetch : Stratégie Cache First pour les assets + fallback offline.html en navigation
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Si c'est une requête de navigation (chargement de page HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Cache First pour les fichiers statiques (CSS, JS, images, fonts, CDN)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Met en cache à la volée les requêtes réussies du même domaine ou cdn
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (request.url.startsWith("http") || request.url.startsWith("https"))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn(`[SW] Échec fetch pour : ${request.url}`, err);
      });
    })
  );
});