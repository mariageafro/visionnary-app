/* Service worker réservé à la construction de production. */
const CACHE = 'visionnary-shell-v1';
const BUILD_ASSETS = [];
// Chemins relatifs à la portée d'installation du service worker (self.registration.scope) : « /» en
// local, « /visionnary-app/ » sous un sous-dossier GitHub Pages — jamais codé en dur.
const SCOPE = new URL(self.registration.scope).pathname;
const SHELL = ['', 'index.html', 'icon.svg', 'director.jpg', 'couple.jpg', 'manifest.webmanifest'].map((p) => SCOPE + p);
const ASSET_RE = new RegExp('^' + SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 'assets/[^/]+\\.(?:js|css|woff2?|png|jpe?g|webp|svg)$');
const publicRequest = url => new Request(url, { credentials: 'omit', cache: 'reload' });
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Un fichier manquant fait échouer l'installation : aucun faux mode hors ligne.
    for (const path of [...SHELL, ...BUILD_ASSETS.map((a) => SCOPE + a)]) {
      const response = await fetch(publicRequest(path));
      if (!response.ok) throw new Error(`Précache indisponible : ${path}`);
      await cache.put(path, response);
    }
    const html = await (await cache.match(SCOPE + 'index.html')).text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => new URL(match[1], self.location.href))
      .filter(url => url.origin === self.location.origin && /\.(?:js|css)$/.test(url.pathname));
    for (const url of assets) {
      const response = await fetch(publicRequest(url.href));
      if (!response.ok) throw new Error(`Asset indisponible : ${url.pathname}`);
      await cache.put(url.href, response);
    }
    // Pas de skipWaiting : une mise à jour attend la fermeture des anciennes fenêtres.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('visionnary-shell-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(SCOPE + 'api') || request.headers.has('Authorization')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { credentials: 'omit' }));
        if (response.ok) return response;
        throw new Error('Navigation indisponible');
      } catch {
        const cached = await caches.match(SCOPE + 'index.html');
        return cached || new Response('VISIONNARY doit être ouvert une première fois avec une connexion.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }
  // Seuls les fichiers publics connus peuvent entrer dans le cache.
  if (!SHELL.includes(url.pathname) && !ASSET_RE.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request.url);
    if (cached) return cached;
    const response = await fetch(new Request(request, { credentials: 'omit' }));
    if (response.ok && response.type !== 'opaque') await cache.put(request.url, response.clone());
    return response;
  })());
});
