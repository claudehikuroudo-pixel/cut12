// オフラインでも開けるようにする。本体(index.html)はネット優先＝更新がすぐ届く。
// v3（2026-09-14）：アイコンを入れ替えたので上げる（アイコンは保存済みを優先して返すため、版を上げないと古いまま）
const CACHE = "cut12-v3";
// 顔検出の部品（CDN・約17MB）は初回に1度だけ取り、別の箱に長く持つ
const RT = "cut12-rt-v1";
// 手書き風の文字（Google Fonts）も同じ箱に入れる＝2回目からはオフラインでも白丸の数字が手書き風になる
const RT_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com", "fonts.googleapis.com", "fonts.gstatic.com"];
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== RT).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (RT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(RT).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
