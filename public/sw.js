// SoundVault PWA Service Worker (Safe & Non-intrusive)
const CACHE_NAME = 'soundvault-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Do NOT intercept navigation requests (Next.js handles routing and SSR)
  if (event.request.mode === 'navigate') {
    return;
  }

  const url = new URL(event.request.url);

  // NEVER intercept Next.js internals, HMR, APIs, audio/video streams, or non-GET
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/media') ||
    url.pathname.includes('/play/') ||
    url.pathname.includes('/download/') ||
    url.pathname.includes('webpack')
  ) {
    return;
  }

  // Only pass through or cache static assets like images/manifest
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});