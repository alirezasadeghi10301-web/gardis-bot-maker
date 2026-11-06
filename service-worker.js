const CACHE_NAME = 'gardis-cache-v3';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith('gardis-cache-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data === 'GARDIS_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/releases.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        return new Response(
          JSON.stringify({ error: 'اطلاعات نسخه در دسترس نیست' }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        );
      })
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request, {
          cache: 'no-cache'
        });

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          const home = await caches.match('./index.html');
          if (home) return home;
        }

        return new Response('اتصال اینترنت برقرار نیست.', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }
    })()
  );
});
