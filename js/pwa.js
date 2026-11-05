/* ==============================================================
   HARIANKU · js/pwa.js
   Mode aplikasi (PWA): Harianku bisa dipasang di layar utama HP/laptop
   dan tetap terbuka tanpa internet.

   Bagian ini hanya bekerja kalau halaman dibuka lewat alamat http(s),
   misalnya setelah dipasang online. Saat index.html dibuka dengan klik
   dua kali (file:///), bagian ini sengaja tidak melakukan apa-apa.
   ============================================================== */

(() => {
  'use strict';

  const lewatWeb = location.protocol === 'https:' || location.protocol === 'http:';
  if (!lewatWeb) return;

  const sudahTerpasang = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /* 1. MANIFEST (nama, ikon, warna aplikasi) -----------------------
     Ditambahkan lewat JavaScript supaya tidak memunculkan pesan galat
     saat halaman dibuka sebagai file. */
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = 'manifest.webmanifest';
  document.head.append(manifest);

  /* 2. SERVICE WORKER (salinan file untuk dipakai offline) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker gagal didaftarkan.', e));
    });
  }

  // Saat sudah dipasang, minta browser tidak menghapus data saat memori penuh
  if (sudahTerpasang() && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  /* 3. TAWARAN "PASANG APLIKASI" -----------------------------------
     Event beforeinstallprompt hanya ada di Chrome/Edge (termasuk Android).
     Di iPhone: Safari > tombol Bagikan > "Tambah ke Layar Utama". */
  const kotak = document.getElementById('info-pasang');
  let tawaran = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // pakai tombol sendiri, bukan pop-up bawaan browser
    tawaran = e;
    if (!Inti.muat('pasangDitutup', false) && !sudahTerpasang()) kotak.hidden = false;
  });

  document.getElementById('pasang-tombol').addEventListener('click', async () => {
    if (!tawaran) return;
    const e = tawaran;
    tawaran = null;
    kotak.hidden = true;
    e.prompt();
    const pilihan = await e.userChoice;
    if (pilihan.outcome === 'accepted') Inti.toast('Harianku sedang dipasang di perangkat ini');
  });

  document.getElementById('pasang-tutup').addEventListener('click', () => {
    kotak.hidden = true;
    Inti.simpan('pasangDitutup', true);
  });

  window.addEventListener('appinstalled', () => {
    kotak.hidden = true;
    tawaran = null;
  });
})();
