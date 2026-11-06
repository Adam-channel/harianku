/* ==============================================================
   HARIANKU · js/main.js
   Menyalakan aplikasi: menjalankan tiap alat, mengatur pindah tab
   (lewat alamat #uang, #tugas, #belanja, #patungan), dan menjaga
   tampilan tetap sesuai saat data atau tanggal berubah.
   File ini dimuat setelah semua alat (sebelum pwa.js).
   ============================================================== */

const Aplikasi = (() => {
  'use strict';

  // Nama tab (dipakai juga untuk judul tab browser)
  const TAB = {
    uang: 'Uang',
    tugas: 'Tugas',
    belanja: 'Belanja',
    patungan: 'Patungan',
  };
  const DAFTAR_TAB = Object.keys(TAB);

  let tabAktif = null;
  let tanggalTampil = Inti.hariIni();

  function tabDariAlamat() {
    const nama = location.hash.slice(1);
    return DAFTAR_TAB.includes(nama) ? nama : null;
  }

  function tampilkan(tab) {
    tabAktif = tab;
    for (const t of DAFTAR_TAB) {
      document.getElementById('halaman-' + t).hidden = t !== tab;
      const tautan = document.querySelector(`.navigasi__tautan[data-tab="${t}"]`);
      if (t === tab) tautan.setAttribute('aria-current', 'page');
      else tautan.removeAttribute('aria-current');
    }
    document.title = `${TAB[tab]} · Harianku`;
    Inti.simpan('tab', tab);   // dibuka lagi di tab yang sama
    Data.perbaruiInfoCadangan();
  }

  // Tanggal hari ini: versi panjang di sidebar, versi pendek di bilah atas HP
  function perbaruiTanggal() {
    const hari = Inti.hariIni();
    document.querySelectorAll('[data-tanggal]').forEach((e) => {
      e.textContent = e.dataset.tanggal === 'pendek' ? Inti.tanggalPendek(hari) : Inti.tanggalPanjang(hari);
    });
  }

  // Baca ulang semua data dari penyimpanan lalu gambar ulang semua alat
  function muatUlangSemua() {
    Uang.muatUlang();
    Tugas.muatUlang();
    Belanja.muatUlang();
    Patungan.muatUlang();
    Data.perbaruiInfoCadangan();
  }


  /* MULAI --------------------------------------------------------- */
  perbaruiTanggal();
  if (!Inti.penyimpananAktif) document.getElementById('peringatan-penyimpanan').hidden = false;

  Uang.mulai();
  Tugas.mulai();
  Belanja.mulai();
  Patungan.mulai();
  Data.mulai();

  // Tab pertama: dari alamat (#tugas), kalau tidak ada pakai tab terakhir
  const tabTersimpan = Inti.muat('tab', 'uang');
  const tabAwal = tabDariAlamat() || (DAFTAR_TAB.includes(tabTersimpan) ? tabTersimpan : 'uang');
  tampilkan(tabAwal);
  if (location.hash.slice(1) !== tabAwal) {
    try { history.replaceState(null, '', '#' + tabAwal); } catch (e) { /* abaikan */ }
  }

  // Pindah tab saat alamat berubah (klik menu, tombol kembali di browser)
  window.addEventListener('hashchange', () => {
    const tab = tabDariAlamat();
    if (tab && tab !== tabAktif) {
      tampilkan(tab);
      window.scrollTo(0, 0);
    }
  });

  // Mengetuk tab yang sedang aktif = gulir ke atas
  document.querySelector('.navigasi').addEventListener('click', (e) => {
    const tautan = e.target.closest('[data-tab]');
    if (tautan && tautan.dataset.tab === tabAktif) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Data diubah dari tab browser lain -> ikut diperbarui
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith('harianku:')) muatUlangSemua();
  });

  // Halaman dibiarkan terbuka sampai ganti hari -> perbarui "Hari ini", tenggat, dll.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const sekarang = Inti.hariIni();
    if (sekarang !== tanggalTampil) {
      tanggalTampil = sekarang;
      perbaruiTanggal();
      muatUlangSemua();
    }
  });

  return { muatUlangSemua, tampilkan };
})();
