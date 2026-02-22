const CACHE = 'ccr-cache-v1';
const ASSETS = [
  './','./index.html','./cases.html','./inventory.html','./market.html','./casino.html','./skill.html','./tournaments.html','./vault.html','./achievements.html','./profile.html','./settings.html','./style.css','./script.js','./manifest.json'
];
self.addEventListener('install', e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch', e=>e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request))));
