// =============================================
// Service Worker — Minhas Finanças
// Estratégia: Cache-first para arquivos locais,
// Network-first com fallback para recursos externos (CDN)
// =============================================

const CACHE_NAME = 'financas-v2';

// Arquivos locais que serão cacheados na instalação
const LOCAL_ASSETS = [
  '/financas/financas.html',
  '/financas/manifest.json',
  '/financas/icon-192.png',
  '/financas/icon-512.png',
];

// ---- INSTALL: cacheia os arquivos do app ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
  );
  // Ativa imediatamente sem esperar a aba fechar
  self.skipWaiting();
});

// ---- ACTIVATE: limpa caches antigos ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  // Assume controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// ---- FETCH: serve do cache, busca na rede se necessário ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos do próprio domínio (GitHub Pages): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Não estava no cache: busca na rede e salva
        return fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        }).catch(() => {
          // Offline e não está no cache: retorna o app principal
          return caches.match('/financas/financas.html');
        });
      })
    );
  } else {
    // Recursos externos (ex: CDN do Tabler Icons): network-first, cache como fallback
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});
