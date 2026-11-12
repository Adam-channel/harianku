/* ==============================================================
   HARIANKU · js/data.js
   Kelola data: cadangan (ekspor), pulihkan (impor), unduh CSV untuk
   Excel, hapus data per alat atau semuanya, dan data contoh untuk
   pengunjung baru.
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


  /* STATISTIK & PENGINGAT CADANGAN -------------------------------- */
  const PENGINGAT_HARI = 14;   // ingatkan kalau cadangan terakhir lebih lama dari ini

  const banyak = (kunci) => {
    const isi = Inti.muat(kunci, []);
    return Array.isArray(isi) ? isi.length : 0;
  };

  function teksCadangan(waktu) {
    if (!waktu) return 'Belum pernah dicadangkan';
    const tanggal = Inti.keTeks(new Date(waktu));
    const beda = -Inti.selisihHari(tanggal);
    if (beda <= 0) return 'Dicadangkan hari ini';
    if (beda === 1) return 'Dicadangkan kemarin';
    if (beda < 31) return `Dicadangkan ${beda} hari lalu`;
    return 'Dicadangkan ' + Inti.tanggalPendek(tanggal);
  }

  // Perbarui tulisan "cadangan terakhir" dan titik pengingat di sidebar/bilah atas
  function perbaruiInfoCadangan() {
    const waktu = Number(Inti.muat('cadanganTerakhir', 0)) || 0;
    // Data contoh tidak dihitung: tidak perlu diingatkan untuk mencadangkannya
    const adaData = banyakAsli('transaksi') + banyakAsli('tugas') + banyakAsli('belanja') > 0;
    const lama = !waktu || Date.now() - waktu > PENGINGAT_HARI * 86400000;
    document.querySelectorAll('[data-info-cadangan]').forEach((e) => { e.textContent = teksCadangan(waktu); });
    document.querySelectorAll('[data-pengingat-cadangan]').forEach((e) => { e.hidden = !(adaData && lama); });
    perbaruiInfoContoh();
  }


  /* DATA CONTOH ---------------------------------------------------
     Untuk pengunjung baru: semua alat diisi contoh supaya terlihat
     seperti apa Harianku saat sudah dipakai. Semua id contoh berawalan
     "contoh-", jadi bisa dihapus tanpa menyentuh data yang ditambahkan
     sendiri. Ubah isi contoh di fungsi buatContoh(). */
  const AWALAN_CONTOH = 'contoh-';
  const ANGGARAN_CONTOH = 3500000;
  const DAFTAR_CONTOH = ['transaksi', 'tugas', 'belanja'];

  const contohKah = (x) => String(x && x.id).startsWith(AWALAN_CONTOH);
  function banyakAsli(kunci) {
    const isi = Inti.muat(kunci, []);
    return Array.isArray(isi) ? isi.filter((x) => !contohKah(x)).length : 0;
  }
  const adaContoh = () => DAFTAR_CONTOH.some((k) => {
    const isi = Inti.muat(k, []);
    return Array.isArray(isi) && isi.some(contohKah);
  });
  const masihKosong = () => DAFTAR_CONTOH.every((k) => banyak(k) === 0) && !Number(Inti.muat('anggaran', 0));

  function buatContoh() {
    const hari = Inti.keTanggal(Inti.hariIni());
    const t = hari.getFullYear(), b = hari.getMonth(), h = hari.getDate();
    const awalBulan = new Date(t, b, 1);
    // Tanggal ke-n bulan ini (tidak melewati hari ini), n hari lalu (tidak keluar dari bulan ini), n hari lagi
    const tanggalKe = (n) => Inti.keTeks(new Date(Math.min(hari, new Date(t, b, n))));
    const mundur = (n) => Inti.keTeks(new Date(Math.max(awalBulan, new Date(t, b, h - n))));
    const maju = (n) => Inti.keTeks(new Date(t, b, h + n));
    const sekarang = Date.now();
    let no = 0;
    const id = () => AWALAN_CONTOH + (++no);
    const waktu = () => sekarang - no * 60000;

    const transaksi = [
      ['masuk', 8500000, 'gaji', tanggalKe(1), 'Gaji bulanan'],
      ['keluar', 1250000, 'tagihan', tanggalKe(2), 'Sewa kos'],
      ['keluar', 185000, 'pulsa', tanggalKe(3), 'Paket internet'],
      ['keluar', 420000, 'belanja', tanggalKe(5), 'Belanja bulanan'],
      ['keluar', 45000, 'makan', mundur(2), 'Makan siang'],
      ['keluar', 24000, 'transport', mundur(1), 'Ojek ke kantor'],
      ['masuk', 750000, 'usaha', mundur(1), 'Proyek desain'],
      ['keluar', 27000, 'makan', tanggalKe(h), 'Kopi & roti'],
    ].map(([jenis, jumlah, kategori, tanggal, catatan]) => ({ id: id(), jenis, jumlah, kategori, tanggal, catatan, dibuat: waktu() }));

    const tugas = [
      ['Kirim lamaran kerja', tanggalKe(h), true, false],
      ['Perbarui CV & portofolio', maju(-2), false, false],
      ['Bayar listrik', maju(1), false, false],
      ['Latihan wawancara', '', true, false],
      ['Beli kado ulang tahun Ibu', '', false, true],
    ].map(([judul, tenggat, penting, selesai]) => ({ id: id(), judul, tenggat, penting, selesai, dibuat: waktu() }));

    const belanja = [
      ['Beras 5 kg', 1, 78000, true],
      ['Telur 1 kg', 1, 29000, false],
      ['Minyak goreng 2 L', 2, 36000, false],
      ['Sabun cuci piring', 1, 0, false],
    ].map(([nama, jumlah, harga, diambil]) => ({ id: id(), nama, jumlah, harga, diambil, dibuat: waktu() }));

    const o = ['Andi', 'Budi', 'Citra'].map((nama) => ({ id: id(), nama }));
    const pesan = (nama, harga, ...siapa) => ({ id: id(), nama, harga, ikut: siapa.map((i) => o[i].id) });
    const patungan = {
      mode: 'rinci', judul: 'Makan malam kantor',
      rata: { total: 450000, orang: 4, bulatkan: 1000 },
      orang: o,
      pesanan: [pesan('Nasi goreng', 35000, 0), pesan('Mie ayam', 28000, 1), pesan('Ayam bakar', 42000, 2),
        pesan('Es teh (3 gelas)', 15000, 0, 1, 2), pesan('Kentang goreng', 25000, 0, 2)],
      servis: 5, pajak: 10, diskon: 0, biayaLain: 0,
    };
    return { transaksi, tugas, belanja, patungan };
  }

  function isiContoh() {
    if (!masihKosong()) return;
    const c = buatContoh();
    for (const k of DAFTAR_CONTOH) Inti.simpan(k, c[k]);
    Inti.simpan('anggaran', ANGGARAN_CONTOH);
    // Patungan hanya diisi kalau belum dipakai
    const p = Inti.muat('patungan', null);
    if (!p || (!p.judul && !(p.pesanan || []).length && !(p.rata && p.rata.total))) Inti.simpan('patungan', c.patungan);
    Aplikasi.muatUlangSemua();
    Inti.toast('Data contoh sudah diisi. Lihat juga Tugas, Belanja, dan Patungan.');
  }

  async function hapusContoh() {
    const ok = await Inti.konfirmasi({
      judul: 'Hapus data contoh?',
      pesan: 'Hanya data contoh yang dihapus. Catatan yang Anda tambahkan sendiri tetap ada.',
      ya: 'Hapus contoh',
    });
    if (!ok) return;
    for (const k of DAFTAR_CONTOH) {
      const isi = Inti.muat(k, []);
      if (!Array.isArray(isi)) continue;
      const sisa = isi.filter((x) => !contohKah(x));
      if (sisa.length) Inti.simpan(k, sisa); else Inti.hapus(k);
    }
    if (Number(Inti.muat('anggaran', 0)) === ANGGARAN_CONTOH) Inti.hapus('anggaran');
    const p = Inti.muat('patungan', null);
    if (p && Array.isArray(p.orang) && p.orang.some(contohKah)) Inti.hapus('patungan');
    Aplikasi.muatUlangSemua();
    Inti.toast('Data contoh dihapus');
  }

  // Kotak di atas halaman: tawarkan contoh saat kosong, atau tombol hapus saat contoh sedang tampil
  function perbaruiInfoContoh() {
    if (!el.contoh) return;
    const modeHapus = adaContoh();
    const tawarkan = !modeHapus && masihKosong() && !Inti.muat('contohDitutup', false);
    el.contoh.hidden = !(modeHapus || tawarkan);
    el.contohTeks.textContent = modeHapus
      ? 'Ini data contoh. Hapus kapan saja, catatan yang Anda tambahkan sendiri tidak ikut terhapus.'
      : 'Baru di Harianku? Lihat dulu seperti apa saat semua alat sudah terisi.';
    el.contohTombol.textContent = modeHapus ? 'Hapus data contoh' : 'Isi data contoh';
    el.contohTombol.className = 'tombol tombol--kecil ' + (modeHapus ? 'tombol--kedua' : 'tombol--utama');
    el.contohTutup.hidden = modeHapus;
  }

  function buka() {
    const kb = Math.max(1, Math.round(Inti.ukuranData() / 1024));
    el.statistik.textContent = `${banyak('transaksi')} transaksi, ${banyak('tugas')} tugas, ${banyak('belanja')} barang (± ${kb} KB)`;
    perbaruiInfoCadangan();
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
    Inti.simpan('cadanganTerakhir', Date.now());
    perbaruiInfoCadangan();
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
    el = {
      dlg: $('dlg-data'), statistik: $('data-statistik'), file: $('data-impor-file'),
      contoh: $('info-contoh'), contohTeks: $('info-contoh-teks'), contohTombol: $('contoh-tombol'), contohTutup: $('contoh-tutup'),
    };

    // Tombol "Kelola data" ada dua: di sidebar (laptop) dan di bilah atas (HP)
    document.querySelectorAll('[data-buka-data]').forEach((b) => b.addEventListener('click', buka));
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

    // Data contoh (dicek dulu: halaman versi lama dari cache belum punya kotaknya)
    if (el.contoh && el.contohTeks && el.contohTombol && el.contohTutup) {
      el.contohTombol.addEventListener('click', () => (adaContoh() ? hapusContoh() : isiContoh()));
      el.contohTutup.addEventListener('click', () => {
        Inti.simpan('contohDitutup', true);
        perbaruiInfoContoh();
      });
    } else {
      el.contoh = null;
    }

    // Data berubah (catat, hapus, pulihkan) -> perbarui pengingat cadangan & kotak data contoh
    document.addEventListener('harianku:berubah', perbaruiInfoCadangan);
  }

  return { mulai, buatCadangan, buatCsv, perbaruiInfoCadangan };
})();
