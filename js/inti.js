/* ==============================================================
   HARIANKU · js/inti.js
   Fungsi bantu yang dipakai bersama oleh semua alat.
   Isi:
     1. Penyimpanan data (localStorage)
     2. Angka & Rupiah
     3. Tanggal
     4. Teks aman untuk HTML, id unik, ikon
     5. Isian Rupiah (titik ribuan otomatis saat mengetik)
     6. Notifikasi kecil (toast) + tombol "Urungkan"
     7. Dialog (buka, tutup, konfirmasi)
     8. Salin / bagikan teks, unduh file
   Semua fungsi dipanggil lewat objek Inti, contoh: Inti.rupiah(25000)
   ============================================================== */

const Inti = (() => {
  'use strict';

  /* 1. PENYIMPANAN ---------------------------------------------
     Data disimpan di localStorage browser dengan awalan "harianku:"
     supaya tidak tercampur dengan situs lain. Tidak ada yang dikirim
     ke internet. Data tetap ada walau browser ditutup, tetapi hilang
     kalau "data situs"/cache browser dibersihkan. */
  const AWALAN = 'harianku:';

  // Cek apakah localStorage bisa dipakai (bisa terblokir di mode privat)
  const penyimpananAktif = (() => {
    try {
      localStorage.setItem(AWALAN + 'uji', '1');
      localStorage.removeItem(AWALAN + 'uji');
      return true;
    } catch (e) {
      return false;
    }
  })();

  function salinNilai(nilai) {
    return nilai === undefined ? undefined : JSON.parse(JSON.stringify(nilai));
  }

  // Ambil data. Kalau belum ada atau rusak, kembalikan nilai bawaan.
  function muat(kunci, bawaan) {
    if (!penyimpananAktif) return salinNilai(bawaan);
    try {
      const teks = localStorage.getItem(AWALAN + kunci);
      return teks === null ? salinNilai(bawaan) : JSON.parse(teks);
    } catch (e) {
      console.warn('Data "' + kunci + '" tidak bisa dibaca, memakai nilai bawaan.', e);
      return salinNilai(bawaan);
    }
  }

  // Simpan data (otomatis diubah ke teks JSON)
  function simpan(kunci, nilai) {
    if (!penyimpananAktif) return false;
    try {
      localStorage.setItem(AWALAN + kunci, JSON.stringify(nilai));
      return true;
    } catch (e) {
      console.warn('Gagal menyimpan "' + kunci + '".', e);
      toast('Gagal menyimpan. Ruang penyimpanan browser mungkin penuh.');
      return false;
    }
  }

  function hapus(kunci) {
    if (penyimpananAktif) localStorage.removeItem(AWALAN + kunci);
  }

  // Semua kunci milik Harianku (tanpa awalan)
  function semuaKunci() {
    if (!penyimpananAktif) return [];
    const hasil = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(AWALAN)) hasil.push(k.slice(AWALAN.length));
    }
    return hasil;
  }

  // Perkiraan besar data dalam byte (1 huruf = 2 byte di localStorage)
  function ukuranData() {
    return semuaKunci().reduce((total, k) => {
      const isi = localStorage.getItem(AWALAN + k) || '';
      return total + (AWALAN.length + k.length + isi.length) * 2;
    }, 0);
  }


  /* 2. ANGKA & RUPIAH ------------------------------------------ */
  const formatRupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  const formatAngka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

  // 25000 -> "Rp 25.000"
  function rupiah(n) {
    return formatRupiah.format(Math.round(Number(n) || 0));
  }

  // 25000 -> "25.000"
  function angka(n) {
    return formatAngka.format(Number(n) || 0);
  }

  // "Rp 25.000" -> 25000 (hanya digit yang diambil)
  function bacaRupiah(teks) {
    const digit = String(teks ?? '').replace(/\D/g, '');
    return digit ? Number(digit) : 0;
  }

  // "11,5" atau "11.5" -> 11.5 (dipakai untuk persen)
  function bacaDesimal(teks) {
    const n = parseFloat(String(teks ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }


  /* 3. TANGGAL ---------------------------------------------------
     Tanggal disimpan sebagai teks "TTTT-BB-HH" (contoh "2026-11-05")
     memakai waktu lokal HP/laptop, bukan UTC. */
  function keTeks(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function hariIni() {
    return keTeks(new Date());
  }

  function keTanggal(teks) {
    const [t, b, h] = String(teks).split('-').map(Number);
    return new Date(t, b - 1, h);
  }

  // Selisih hari dari "dari" ke "teks". Positif = di masa depan.
  function selisihHari(teks, dari = hariIni()) {
    const a = keTanggal(dari);
    const b = keTanggal(teks);
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  }

  const fmtPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTanpaTahun = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtPendek = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtPendekTahun = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtBulan = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });

  const tahunIni = (d) => d.getFullYear() === new Date().getFullYear();

  // "2026-11-05" -> "Kamis, 5 November 2026"
  function tanggalPanjang(teks) {
    return fmtPanjang.format(keTanggal(teks));
  }

  // "2026-11-05" -> "Kam, 5 Nov" (tahun ditambahkan kalau bukan tahun ini)
  function tanggalPendek(teks) {
    const d = keTanggal(teks);
    return tahunIni(d) ? fmtPendek.format(d) : fmtPendekTahun.format(d);
  }

  // Judul kelompok di daftar: "Hari ini", "Kemarin", atau "Senin, 3 November"
  function labelHari(teks) {
    const beda = selisihHari(teks);
    if (beda === 0) return 'Hari ini';
    if (beda === -1) return 'Kemarin';
    const d = keTanggal(teks);
    return tahunIni(d) ? fmtTanpaTahun.format(d) : fmtPanjang.format(d);
  }

  // "2026-11" -> "November 2026"
  function namaBulan(teksBulan) {
    return fmtBulan.format(keTanggal(teksBulan + '-01'));
  }


  /* 4. TEKS AMAN, ID, IKON --------------------------------------
     esc() wajib dipakai untuk semua teks ketikan pengguna yang
     dimasukkan ke HTML, supaya tanda < > tidak merusak halaman. */
  const PETA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(teks) {
    return String(teks ?? '').replace(/[&<>"']/g, (c) => PETA_ESC[c]);
  }

  // Id unik pendek, contoh "m3k9x2ab4f"
  function buatId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // HTML ikon dari kumpulan ikon di index.html, contoh ikon('sampah')
  function ikon(nama) {
    return '<svg class="ikon" aria-hidden="true"><use href="#i-' + nama + '"/></svg>';
  }

  // Gambar ulang isi sebuah wadah tanpa kehilangan fokus keyboard.
  // Tombol yang sedang difokus dikenali dari data-aksi + data-id-nya.
  function jagaFokus(wadah, gambar) {
    const aktif = document.activeElement;
    let pemilih = null;
    if (aktif && wadah.contains(aktif) && aktif.dataset && aktif.dataset.id) {
      pemilih = '[data-aksi="' + aktif.dataset.aksi + '"][data-id="' + CSS.escape(aktif.dataset.id) + '"]';
    }
    gambar();
    if (pemilih) {
      const baru = wadah.querySelector(pemilih);
      if (baru) baru.focus();
    }
  }


  /* 5. ISIAN RUPIAH ----------------------------------------------
     Semua <input data-rupiah> otomatis diberi titik ribuan saat
     diketik (25000 -> 25.000). Baca nilainya dengan bacaRupiah(). */
  function rapikanIsianRupiah(input) {
    const kursor = input.selectionStart ?? input.value.length;
    const digitSebelumKursor = input.value.slice(0, kursor).replace(/\D/g, '').length;
    const digit = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
    input.value = digit ? angka(Number(digit)) : '';

    // Kembalikan kursor ke posisi yang sama (setelah digit yang sama)
    let posisi = 0;
    let hitung = 0;
    while (posisi < input.value.length && hitung < digitSebelumKursor) {
      if (/\d/.test(input.value[posisi])) hitung++;
      posisi++;
    }
    if (document.activeElement === input) input.setSelectionRange(posisi, posisi);
  }

  // "true" di akhir = dijalankan paling awal, sebelum pendengar lain membaca nilainya
  document.addEventListener('input', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.hasAttribute('data-rupiah')) rapikanIsianRupiah(e.target);
  }, true);

  // Isi kotak Rupiah dari angka (0 = dikosongkan)
  function isiRupiah(input, n) {
    input.value = n ? angka(n) : '';
  }


  /* 6. TOAST -----------------------------------------------------
     toast('Tersimpan')
     toast('Dihapus', { aksi: 'Urungkan', onAksi: () => {...} }) */
  let timerToast = null;

  function tutupToast() {
    clearTimeout(timerToast);
    const wadah = document.getElementById('toast');
    if (wadah) wadah.replaceChildren();
  }

  function toast(pesan, opsi = {}) {
    const wadah = document.getElementById('toast');
    if (!wadah) return;
    clearTimeout(timerToast);
    wadah.replaceChildren();

    const kotak = document.createElement('div');
    kotak.className = 'toast';
    const teks = document.createElement('span');
    teks.textContent = pesan;
    kotak.append(teks);

    if (opsi.aksi && typeof opsi.onAksi === 'function') {
      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'toast__aksi';
      tombol.textContent = opsi.aksi;
      tombol.addEventListener('click', () => { tutupToast(); opsi.onAksi(); });
      kotak.append(tombol);
    }

    // Jeda hitung mundur saat kursor/fokus ada di toast
    const lama = opsi.durasi || (opsi.aksi ? 8000 : 3500);   // milidetik
    const mulaiHitung = () => { clearTimeout(timerToast); timerToast = setTimeout(tutupToast, lama); };
    kotak.addEventListener('mouseenter', () => clearTimeout(timerToast));
    kotak.addEventListener('mouseleave', mulaiHitung);
    kotak.addEventListener('focusin', () => clearTimeout(timerToast));
    kotak.addEventListener('focusout', mulaiHitung);

    wadah.append(kotak);
    mulaiHitung();
  }


  /* 7. DIALOG ---------------------------------------------------- */
  function bukaDialog(dlg) {
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function tutupDialog(dlg) {
    if (!dlg.open) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  // Tombol [data-tutup] menutup dialognya.
  // Klik di luar kotak menutup dialog yang punya atribut data-tutup-luar.
  document.addEventListener('click', (e) => {
    const tombol = e.target.closest('[data-tutup]');
    if (tombol) {
      const dlg = tombol.closest('dialog');
      if (dlg) tutupDialog(dlg);
      return;
    }
    if (e.target instanceof HTMLDialogElement && e.target.hasAttribute('data-tutup-luar')) tutupDialog(e.target);
  });

  // Tanya "yakin?". Hasilnya true kalau pengguna menekan tombol "ya".
  // Contoh: if (await Inti.konfirmasi({ judul: 'Hapus?', pesan: '...' })) {...}
  // Jawaban dibaca dari event "submit" (tombol ditekan) dan "cancel" (tombol Esc)
  // yang terjadi seketika. Event "close" sengaja tidak dipakai karena dikirim
  // belakangan dan bisa tertunda saat halaman tidak terlihat.
  function konfirmasi({ judul, pesan = '', ya = 'Hapus', bahaya = true }) {
    const dlg = document.getElementById('dlg-konfirmasi');
    const form = dlg.querySelector('form');
    dlg.querySelector('#konfirmasi-judul').textContent = judul;
    dlg.querySelector('#konfirmasi-pesan').textContent = pesan;
    const tombolYa = dlg.querySelector('#konfirmasi-ya');
    tombolYa.textContent = ya;
    tombolYa.className = 'tombol ' + (bahaya ? 'tombol--bahaya' : 'tombol--utama');

    return new Promise((selesai) => {
      const akhiri = (hasil) => {
        form.removeEventListener('submit', saatTombol);
        dlg.removeEventListener('cancel', saatEsc);
        tutupDialog(dlg);
        selesai(hasil);
      };
      const saatTombol = (e) => {
        e.preventDefault();
        akhiri(!!e.submitter && e.submitter.value === 'ya');
      };
      const saatEsc = () => akhiri(false);
      form.addEventListener('submit', saatTombol);
      dlg.addEventListener('cancel', saatEsc);
      bukaDialog(dlg);
    });
  }


  /* 8. SALIN, BAGIKAN, UNDUH ------------------------------------- */
  async function salinTeks(teks) {
    try {
      await navigator.clipboard.writeText(teks);
      return true;
    } catch (e) {
      // Cara lama, untuk browser yang tidak mengizinkan clipboard API
      const area = document.createElement('textarea');
      area.value = teks;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      let berhasil = false;
      try { berhasil = document.execCommand('copy'); } catch (e2) { berhasil = false; }
      area.remove();
      return berhasil;
    }
  }

  // Di HP: buka menu "Bagikan" (WhatsApp, dll). Di laptop: salin ke clipboard.
  async function bagikanTeks(teks, judul) {
    const layarSentuh = window.matchMedia('(pointer: coarse)').matches;
    if (navigator.share && layarSentuh) {
      try {
        await navigator.share({ title: judul, text: teks });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;   // pengguna membatalkan
      }
    }
    if (await salinTeks(teks)) toast('Teks disalin. Tinggal tempel (paste) di WhatsApp atau chat lain.');
    else toast('Gagal menyalin teks.');
  }

  // Buat file dari teks lalu unduh, contoh unduhFile('a.json', '{...}', 'application/json')
  function unduhFile(namaFile, isi, jenis) {
    const blob = new Blob([isi], { type: jenis });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }


  return {
    penyimpananAktif, muat, simpan, hapus, semuaKunci, ukuranData,
    rupiah, angka, bacaRupiah, bacaDesimal,
    keTeks, hariIni, keTanggal, selisihHari, tanggalPanjang, tanggalPendek, labelHari, namaBulan,
    esc, buatId, ikon, jagaFokus, isiRupiah,
    toast, tutupToast, bukaDialog, tutupDialog, konfirmasi,
    salinTeks, bagikanTeks, unduhFile,
  };
})();
