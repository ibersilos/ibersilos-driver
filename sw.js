const CACHE = 'ibersilos-drv-v1';
const APP_SHELL = [
    '/ibersilos-driver/',
    '/ibersilos-driver/index.html',
    '/ibersilos-driver/app.js',
    '/ibersilos-driver/logo.jpg',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Cache-first per app shell, network-first per tutto il resto (Firebase, CDN)
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    const isAppShell = url.origin === self.location.origin &&
        APP_SHELL.some(p => url.pathname === p || url.pathname.startsWith('/ibersilos-driver/') && e.request.destination === 'document');

    if (isAppShell) {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request))
        );
    }
    // Firebase, gstatic, CDN esterni → pass-through (non mettere in cache)
});
