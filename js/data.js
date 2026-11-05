/* ==============================================================
   HARIANKU · js/data.js
   Kelola data: cadangan (ekspor), pulihkan (impor), unduh CSV untuk
   Excel, dan hapus data per alat atau semuanya.
   Dibuka dari tombol "Data" di kepala halaman.
   ============================================================== */

const Data = (() => {
  'use strict';

  /* Pemisah kolom CSV. Excel dengan format wilayah Indonesia memakai
     titik koma (;). Kalau saat dibuka di Excel semua isi menumpuk di
     satu kolom, ganti menjadi ',' */
  const PEMISAH_CSV = ';';

  // Kunci localStorage yang ikut dicadangkan
  const KUNCI_CADANGAN = ['transaksi', 'anggaran', 'tugas', 'belanja', 'patungan'];

  const ALAT = {
    uang: { kunci: ['transaksi', 'anggaran'], judul: 'Hapus catatan uang?', pesan: 'Semua transaksi dan batas anggaran akan dihapus dari browser ini.', selesai: 'Catatan uang dihapus' },
    tugas: { kunci: ['tugas'], judul: 'Hapus daftar tugas?', pesan: 'Semua tugas, termasuk yang sudah selesai, akan dihapus.', selesai: 'Daftar tugas dihapus' },
    belanja: { kunci: ['belanja'], judul: 'Hapus daftar belanja?', pesan: 'Semua barang di daftar belanja akan dihapus.', selesai: 'Daftar belanja dihapus' },
    patungan: { kunci: ['patungan'], judul: 'Kosongkan patungan?', pesan: 'Nama orang, pesanan, dan biaya di kalkulator patungan akan dikosongkan.', selesai: 'Patungan dikosongkan' },
  };

  const $ = (id) => document.getElementById(id);
  let el = {};

  function selesaiDanTutup(pesan) {
    Inti.tutupDialog(el.dlg);
    Inti.toast(pesan);
  }


  /* STATISTIK ----------------------------------------------------- */
  function buka() {
    const n = (x) => (Array.isArray(x) ? x.length : 0);
    const kb = Math.max(1, Math.round(Inti.ukuranData() / 1024));
    el.statistik.textContent = `Tersimpan: ${n(Inti.muat('transaksi', []))} transaksi, ${n(Inti.muat('tugas', []))} tugas, `
      + `${n(Inti.muat('belanja', []))} barang belanja (± ${kb} KB).`;
    Inti.bukaDialog(el.dlg);
  }


  /* CADANGAN (EKSPOR) --------------------------------------------- */
  function buatCadangan() {
    const data = {};
    for (const k of KUNCI_CADANGAN) {
      const nilai = Inti.muat(k, null);
      if (nilai !== null) data[k] = nilai;
    }
    return { aplikasi: 'Harianku', versi: 1, dibuat: new Date().toISOString(), data };
  }

  function ekspor() {
    const isi = JSON.stringify(buatCadangan(), null, 2);
    Inti.unduhFile(`harianku-cadangan-${Inti.hariIni()}.json`, isi, 'application/json');
    selesaiDanTutup('File cadangan diunduh. Simpan di tempat aman, misalnya Google Drive.');
  }


  /* PULIHKAN (IMPOR) ---------------------------------------------- */
  async function impor(file) {
    let isi;
    try {
      isi = JSON.parse(await file.text());
    } catch (e) {
      selesaiDanTutup('File tidak bisa dibaca. Pilih file cadangan Harianku (.json).');
      return;
    }
    if (!isi || isi.aplikasi !== 'Harianku' || !isi.data || typeof isi.data !== 'object') {
      selesaiDanTutup('Ini bukan file cadangan Harianku.');
      return;
    }

    const dibuat = new Date(isi.dibuat);
    const dari = Number.isNaN(dibuat.getTime()) ? '' : ` tanggal ${Inti.tanggalPanjang(Inti.keTeks(dibuat))}`;
    const ok = await Inti.konfirmasi({
      judul: 'Pulihkan data dari cadangan?',
      pesan: `Data di browser ini akan diganti dengan isi file cadangan${dari}. Data yang sekarang ada akan tertimpa.`,
      ya: 'Ganti & pulihkan',
    });
    if (!ok) return;

    for (const k of KUNCI_CADANGAN) {
      if (isi.data[k] !== undefined && isi.data[k] !== null) Inti.simpan(k, isi.data[k]);
      else Inti.hapus(k);
    }
    Aplikasi.muatUlangSemua();
    selesaiDanTutup('Data berhasil dipulihkan dari cadangan');
  }


  /* CSV UNTUK EXCEL ----------------------------------------------- */
  function selCsv(nilai) {
    const teks = String(nilai ?? '');
    return /[";,\r\n]/.test(teks) ? '"' + teks.replace(/"/g, '""') + '"' : teks;
  }

  function buatCsv() {
    const transaksi = Uang.semuaTransaksi().sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.dibuat - b.dibuat);
    const baris = [['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Pemasukan', 'Pengeluaran']];
    for (const t of transaksi) {
      const masuk = t.jenis === 'masuk';
      baris.push([t.tanggal, masuk ? 'Pemasukan' : 'Pengeluaran', Uang.namaKategori(t.kategori), t.catatan, masuk ? t.jumlah : '', masuk ? '' : t.jumlah]);
    }
    // ﻿ (BOM) supaya Excel membaca huruf/emoji dengan benar
    return { jumlah: transaksi.length, isi: '﻿' + baris.map((b) => b.map(selCsv).join(PEMISAH_CSV)).join('\r\n') };
  }

  function unduhCsv() {
    const csv = buatCsv();
    if (!csv.jumlah) { selesaiDanTutup('Belum ada transaksi untuk diunduh.'); return; }
    Inti.unduhFile(`harianku-transaksi-${Inti.hariIni()}.csv`, csv.isi, 'text/csv;charset=utf-8');
    selesaiDanTutup(`${csv.jumlah} transaksi diunduh sebagai CSV`);
  }


  /* HAPUS --------------------------------------------------------- */
  async function hapusData(alat) {
    if (alat === 'semua') {
      const ok = await Inti.konfirmasi({
        judul: 'Hapus SEMUA data?',
        pesan: 'Catatan uang, tugas, daftar belanja, dan patungan akan dihapus dari browser ini dan tidak bisa dikembalikan. Unduh cadangan dulu kalau masih perlu.',
        ya: 'Ya, hapus semua',
      });
      if (!ok) return;
      for (const k of Inti.semuaKunci()) Inti.hapus(k);
      Aplikasi.muatUlangSemua();
      selesaiDanTutup('Semua data sudah dihapus');
      return;
    }

    const info = ALAT[alat];
    if (!info) return;
    const ok = await Inti.konfirmasi({ judul: info.judul, pesan: info.pesan, ya: 'Hapus' });
    if (!ok) return;
    for (const k of info.kunci) Inti.hapus(k);
    Aplikasi.muatUlangSemua();
    selesaiDanTutup(info.selesai);
  }


  /* MULAI --------------------------------------------------------- */
  function mulai() {
    el = { dlg: $('dlg-data'), statistik: $('data-statistik'), file: $('data-impor-file') };

    $('tombol-data').addEventListener('click', buka);
    $('data-ekspor').addEventListener('click', ekspor);
    $('data-impor').addEventListener('click', () => el.file.click());
    el.file.addEventListener('change', () => {
      const file = el.file.files[0];
      el.file.value = '';            // supaya file yang sama bisa dipilih lagi
      if (file) impor(file);
    });
    $('data-csv').addEventListener('click', unduhCsv);
    el.dlg.addEventListener('click', (e) => {
      const tombol = e.target.closest('[data-hapus]');
      if (tombol) hapusData(tombol.dataset.hapus);
    });
  }

  return { mulai, buatCadangan, buatCsv };
})();
