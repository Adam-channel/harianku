/* ==============================================================
   HARIANKU · sw.js (service worker)
   Membuat Harianku tetap bisa dibuka tanpa internet setelah
   dipasang online (misalnya di GitHub Pages).

   Cara kerjanya:
     1. Saat pertama kali dibuka, semua file di BERKAS disimpan ke cache.
     2. Setiap membuka halaman: coba ambil file terbaru dari internet
        dulu, jadi hasil edit langsung terlihat. Kalau offline atau
        jaringan lebih lambat dari BATAS_TUNGGU, pakai salinan di cache.

   Service worker hanya aktif lewat alamat http(s). Saat index.html
   dibuka dengan klik dua kali (file:///) file ini tidak dipakai.

   Kalau menambah file baru: masukkan namanya ke BERKAS, lalu naikkan
   VERSI (misalnya 'harianku-v2') supaya cache lama dibersihkan.
   ============================================================== */

const VERSI = 'harianku-v1';

const BERKAS = [
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/inti.js',
  './js/uang.js',
  './js/tugas.js',
  './js/belanja.js',
  './js/patungan.js',
  './js/data.js',
  './js/main.js',
  './js/pwa.js',
  './ikon/ikon.svg',
  './ikon/ikon-192.png',
  './ikon/ikon-512.png',
  './ikon/ikon-maskable-192.png',
  './ikon/ikon-maskable-512.png',
  './ikon/apple-touch-icon.png',
];

const BATAS_TUNGGU = 4000;   // milidetik

// 1. Pasang: simpan semua file aplikasi ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSI)
      .then((cache) => cache.addAll(BERKAS))
      .then(() => self.skipWaiting())
  );
});

// 2. Aktif: hapus cache dari versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((semua) => Promise.all(
        semua.filter((nama) => nama.startsWith('harianku-') && nama !== VERSI).map((nama) => caches.delete(nama))
      ))
      .then(() => self.clients.claim())
  );
});

// 3. Setiap permintaan file dari situs ini: internet dulu, cache sebagai cadangan
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(internetDulu(req));
});

async function internetDulu(req) {
  const cache = await caches.open(VERSI);

  // Ambil dari internet. Kalau berhasil, salinan di cache ikut diperbarui.
  const dariInternet = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  });
  dariInternet.catch(() => {});   // gagal di sini sudah ditangani di bawah

  try {
    return await Promise.race([dariInternet, tunggu(BATAS_TUNGGU)]);
  } catch (e) {
    // Offline atau terlalu lama: pakai salinan di cache
    const salinan = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    return salinan || dariInternet;
  }
}

function tunggu(ms) {
  return new Promise((_, gagal) => setTimeout(() => gagal(new Error('Jaringan terlalu lama')), ms));
}
