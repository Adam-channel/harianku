/* ==============================================================
   HARIANKU · js/uang.js
   Alat 1: Catatan Uang (pemasukan & pengeluaran dalam Rupiah)

   Data di localStorage:
     "harianku:transaksi" -> daftar transaksi
     "harianku:anggaran"  -> batas pengeluaran per bulan (angka, 0 = mati)

   Bentuk satu transaksi:
     { id: "m3k9x2ab4f", jenis: "keluar" | "masuk", jumlah: 25000,
       kategori: "makan", tanggal: "2026-11-05", catatan: "Makan siang",
       dibuat: 1730790000000 }
   ============================================================== */

const Uang = (() => {
  'use strict';

  /* KATEGORI ------------------------------------------------------
     Silakan ubah nama/ikon atau tambah baris baru.
     Jangan mengganti "id" yang sudah terpakai, karena id itulah yang
     tersimpan di data transaksi. */
  const KATEGORI = {
    keluar: [
      { id: 'makan',      nama: 'Makan & minum',      ikon: '🍜' },
      { id: 'transport',  nama: 'Transportasi',       ikon: '🛵' },
      { id: 'belanja',    nama: 'Belanja harian',     ikon: '🛒' },
      { id: 'tagihan',    nama: 'Tagihan & cicilan',  ikon: '🧾' },
      { id: 'pulsa',      nama: 'Pulsa & internet',   ikon: '📱' },
      { id: 'kesehatan',  nama: 'Kesehatan',          ikon: '💊' },
      { id: 'hiburan',    nama: 'Hiburan',            ikon: '🎬' },
      { id: 'pendidikan', nama: 'Pendidikan',         ikon: '📚' },
      { id: 'sedekah',    nama: 'Sedekah & hadiah',   ikon: '🤲' },
      { id: 'lain-keluar', nama: 'Lainnya',           ikon: '📦' },
    ],
    masuk: [
      { id: 'gaji',       nama: 'Gaji',               ikon: '💼' },
      { id: 'usaha',      nama: 'Usaha & penjualan',  ikon: '🏪' },
      { id: 'bonus',      nama: 'Bonus & hadiah',     ikon: '🎁' },
      { id: 'kiriman',    nama: 'Kiriman / transfer', ikon: '💸' },
      { id: 'lain-masuk', nama: 'Lainnya',            ikon: '📦' },
    ],
  };

  const $ = (id) => document.getElementById(id);
  let el = {};                 // elemen halaman (diisi di mulai())

  // Keadaan alat ini
  let transaksi = [];
  let anggaran = 0;
  let bulanAktif = Inti.hariIni().slice(0, 7);   // "2026-11"
  let idDiubah = null;                            // null = sedang menambah baru

  function cariKategori(id) {
    return KATEGORI.keluar.find((k) => k.id === id)
      || KATEGORI.masuk.find((k) => k.id === id)
      || { id, nama: 'Lainnya', ikon: '📦' };
  }


  /* DATA ---------------------------------------------------------- */
  function muatData() {
    const mentah = Inti.muat('transaksi', []);
    transaksi = (Array.isArray(mentah) ? mentah : [])
      .filter((t) => t && t.id && Number(t.jumlah) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.tanggal))
      .map((t) => ({
        id: String(t.id),
        jenis: t.jenis === 'masuk' ? 'masuk' : 'keluar',
        jumlah: Math.round(Number(t.jumlah)),
        kategori: String(t.kategori || ''),
        tanggal: t.tanggal,
        catatan: String(t.catatan || ''),
        dibuat: Number(t.dibuat) || 0,
      }));
    anggaran = Math.max(0, Math.round(Number(Inti.muat('anggaran', 0)) || 0));
  }

  function simpanData() {
    Inti.simpan('transaksi', transaksi);
  }


  /* TAMPILAN ------------------------------------------------------ */
  function render() {
    const bulanIni = Inti.hariIni().slice(0, 7);
    el.bulanLabel.textContent = Inti.namaBulan(bulanAktif);
    el.bulanIni.hidden = bulanAktif === bulanIni;

    const diBulan = transaksi.filter((t) => t.tanggal.slice(0, 7) === bulanAktif);
    let masuk = 0;
    let keluar = 0;
    for (const t of diBulan) {
      if (t.jenis === 'masuk') masuk += t.jumlah;
      else keluar += t.jumlah;
    }
    const sisa = masuk - keluar;

    el.totalMasuk.textContent = Inti.rupiah(masuk);
    el.totalKeluar.textContent = Inti.rupiah(keluar);
    el.sisa.textContent = Inti.rupiah(sisa);
    el.sisa.classList.toggle('angka--keluar', sisa < 0);

    renderAnggaran(keluar, bulanAktif === bulanIni);
    renderKategori(diBulan, keluar);
    Inti.jagaFokus(el.daftar, () => renderDaftar(diBulan));
  }

  function renderAnggaran(keluar, bulanBerjalan) {
    if (!anggaran) {
      el.anggaran.innerHTML = `
        <div class="anggaran__kepala">
          <span class="label-kecil">Batas anggaran bulanan</span>
          <button type="button" class="tombol tombol--teks tombol--kecil" data-aksi="atur-anggaran">Atur</button>
        </div>
        <p class="bantuan">Belum diatur. Pasang batas supaya tahu sisa jatah per hari.</p>`;
      return;
    }

    const persen = Math.round((keluar / anggaran) * 100);
    const sisa = anggaran - keluar;
    const warna = persen >= 100 ? 'merah' : persen >= 80 ? 'oranye' : 'hijau';
    const keterangan = sisa >= 0
      ? `Terpakai ${persen}% · sisa ${Inti.rupiah(sisa)}`
      : `Lewat ${Inti.rupiah(-sisa)} dari batas`;

    // Jatah per hari hanya dihitung untuk bulan yang sedang berjalan
    let jatah = '';
    if (bulanBerjalan && sisa > 0) {
      const sekarang = new Date();
      const hariTerakhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 0).getDate();
      const hariTersisa = hariTerakhir - sekarang.getDate() + 1;   // termasuk hari ini
      jatah = `<p class="anggaran__jatah">Jatah per hari sampai akhir bulan: <strong>${Inti.rupiah(Math.floor(sisa / hariTersisa))}</strong></p>`;
    }

    el.anggaran.innerHTML = `
      <div class="anggaran__kepala">
        <span class="label-kecil">Anggaran ${Inti.rupiah(anggaran)} / bulan</span>
        <button type="button" class="tombol tombol--teks tombol--kecil" data-aksi="atur-anggaran">Ubah</button>
      </div>
      <div class="bar bar--${warna}" role="progressbar" aria-label="Anggaran terpakai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(persen, 100)}">
        <span style="width:${Math.min(persen, 100)}%"></span>
      </div>
      <p class="anggaran__ket anggaran__ket--${warna}">${keterangan}</p>
      ${jatah}`;
  }

  function renderKategori(diBulan, totalKeluar) {
    const per = new Map();
    for (const t of diBulan) {
      if (t.jenis === 'keluar') per.set(t.kategori, (per.get(t.kategori) || 0) + t.jumlah);
    }
    if (!per.size) {
      el.perKategori.innerHTML = '<li class="kosong kosong--kecil">Belum ada pengeluaran di bulan ini.</li>';
      return;
    }
    el.perKategori.innerHTML = [...per]
      .sort((a, b) => b[1] - a[1])
      .map(([id, jumlah]) => {
        const k = cariKategori(id);
        const persen = Math.round((jumlah / totalKeluar) * 100);
        return `<li>
          <div class="kategori__atas">
            <span class="kategori__nama">${k.ikon} ${Inti.esc(k.nama)}</span>
            <span class="kategori__nilai">${Inti.rupiah(jumlah)} · ${persen}%</span>
          </div>
          <div class="bar" aria-hidden="true"><span style="width:${Math.max(persen, 2)}%"></span></div>
        </li>`;
      })
      .join('');
  }

  function renderDaftar(diBulan) {
    if (!diBulan.length) {
      el.daftar.innerHTML = `<p class="kosong"><span class="kosong__ikon" aria-hidden="true">🧾</span>
        Belum ada transaksi di ${Inti.esc(Inti.namaBulan(bulanAktif))}.<br>Tekan <strong>Catat</strong> untuk menambah.</p>`;
      return;
    }

    // Urutkan terbaru di atas, lalu kelompokkan per tanggal
    const urut = [...diBulan].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.dibuat - a.dibuat);
    const grup = new Map();
    for (const t of urut) {
      if (!grup.has(t.tanggal)) grup.set(t.tanggal, []);
      grup.get(t.tanggal).push(t);
    }

    let html = '';
    for (const [tanggal, isi] of grup) {
      const keluarHari = isi.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0);
      html += `<h4 class="grup-tanggal"><span>${Inti.esc(Inti.labelHari(tanggal))}</span>${keluarHari ? `<span>Keluar ${Inti.rupiah(keluarHari)}</span>` : ''}</h4>`;
      html += `<ul class="daftar">${isi.map(itemHtml).join('')}</ul>`;
    }
    el.daftar.innerHTML = html;
  }

  function itemHtml(t) {
    const k = cariKategori(t.kategori);
    const judul = t.catatan || k.nama;
    const sub = t.catatan ? k.nama : (t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran');
    const masuk = t.jenis === 'masuk';
    const id = Inti.esc(t.id);
    return `<li>
      <button type="button" class="item__utama" data-aksi="ubah" data-id="${id}">
        <span class="item__ikon" aria-hidden="true">${k.ikon}</span>
        <span class="item__teks">
          <span class="item__judul">${Inti.esc(judul)}</span>
          <span class="item__sub">${Inti.esc(sub)}</span>
        </span>
        <span class="item__nilai${masuk ? ' angka--masuk' : ''}">${masuk ? '+' : '−'}${Inti.rupiah(t.jumlah)}</span>
      </button>
      <button type="button" class="tombol-ikon tombol-ikon--bahaya" data-aksi="hapus" data-id="${id}" aria-label="Hapus ${Inti.esc(judul)} ${Inti.rupiah(t.jumlah)}">${Inti.ikon('sampah')}</button>
    </li>`;
  }


  /* FORM TRANSAKSI (tambah & ubah memakai dialog yang sama) ------- */
  function isiPilihanKategori(jenis, terpilih) {
    const pilihan = KATEGORI[jenis] || KATEGORI.keluar;
    const select = el.form.elements.kategori;
    select.innerHTML = pilihan.map((k) => `<option value="${Inti.esc(k.id)}">${k.ikon} ${Inti.esc(k.nama)}</option>`).join('');
    select.value = pilihan.some((k) => k.id === terpilih) ? terpilih : pilihan[0].id;
  }

  // t = transaksi yang diubah (null = baru). isian = nilai awal untuk transaksi baru.
  function bukaForm(t, isian = {}) {
    idDiubah = t ? t.id : null;
    const bulanIni = Inti.hariIni().slice(0, 7);
    const nilai = t || Object.assign({
      jenis: 'keluar',
      jumlah: 0,
      kategori: '',
      tanggal: bulanAktif === bulanIni ? Inti.hariIni() : bulanAktif + '-01',
      catatan: '',
    }, isian);

    const f = el.form.elements;
    el.judulForm.textContent = t ? 'Ubah transaksi' : 'Catat transaksi';
    f.jenis.value = nilai.jenis;
    isiPilihanKategori(nilai.jenis, nilai.kategori);
    Inti.isiRupiah(f.jumlah, nilai.jumlah);
    f.tanggal.value = nilai.tanggal;
    f.catatan.value = nilai.catatan;
    el.galat.hidden = true;
    el.tombolHapus.hidden = !t;
    Inti.bukaDialog(el.dlg);
  }

  function simpanForm(e) {
    e.preventDefault();
    const f = el.form.elements;
    const jumlah = Inti.bacaRupiah(f.jumlah.value);
    if (jumlah <= 0) {
      el.galat.hidden = false;
      f.jumlah.focus();
      return;
    }

    const data = {
      jenis: f.jenis.value === 'masuk' ? 'masuk' : 'keluar',
      jumlah,
      kategori: f.kategori.value,
      tanggal: /^\d{4}-\d{2}-\d{2}$/.test(f.tanggal.value) ? f.tanggal.value : Inti.hariIni(),
      catatan: f.catatan.value.trim(),
    };

    const lama = idDiubah ? transaksi.find((t) => t.id === idDiubah) : null;
    if (lama) Object.assign(lama, data);
    else transaksi.push({ id: Inti.buatId(), dibuat: Date.now(), ...data });

    simpanData();
    bulanAktif = data.tanggal.slice(0, 7);   // tampilkan bulan transaksi yang baru disimpan
    Inti.tutupDialog(el.dlg);
    render();
    Inti.toast(lama ? 'Perubahan disimpan' : `${data.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'} ${Inti.rupiah(jumlah)} dicatat`);
  }

  function hapusTransaksi(id) {
    const posisi = transaksi.findIndex((t) => t.id === id);
    if (posisi < 0) return;
    const [lama] = transaksi.splice(posisi, 1);
    simpanData();
    render();
    Inti.toast('Transaksi dihapus', {
      aksi: 'Urungkan',
      onAksi: () => {
        transaksi.splice(Math.min(posisi, transaksi.length), 0, lama);
        simpanData();
        render();
      },
    });
  }

  function geserBulan(arah) {
    const [t, b] = bulanAktif.split('-').map(Number);
    const d = new Date(t, b - 1 + arah, 1);
    bulanAktif = Inti.keTeks(d).slice(0, 7);
    render();
  }


  /* ANGGARAN ------------------------------------------------------ */
  function bukaAnggaran() {
    Inti.isiRupiah(el.formAnggaran.elements.jumlah, anggaran);
    Inti.bukaDialog(el.dlgAnggaran);
  }

  function simpanAnggaran(e) {
    e.preventDefault();
    anggaran = Inti.bacaRupiah(el.formAnggaran.elements.jumlah.value);
    if (anggaran) Inti.simpan('anggaran', anggaran);
    else Inti.hapus('anggaran');
    Inti.tutupDialog(el.dlgAnggaran);
    render();
    Inti.toast(anggaran ? 'Anggaran bulanan disimpan' : 'Batas anggaran dimatikan');
  }


  /* MULAI --------------------------------------------------------- */
  function mulai() {
    el = {
      bulanLabel: $('uang-bulan-label'),
      bulanIni: $('uang-bulan-ini'),
      totalMasuk: $('uang-total-masuk'),
      totalKeluar: $('uang-total-keluar'),
      sisa: $('uang-sisa'),
      anggaran: $('uang-anggaran'),
      perKategori: $('uang-per-kategori'),
      daftar: $('uang-daftar'),
      dlg: $('dlg-transaksi'),
      form: $('form-transaksi'),
      judulForm: $('dlg-transaksi-judul'),
      galat: $('transaksi-galat'),
      tombolHapus: $('transaksi-hapus'),
      dlgAnggaran: $('dlg-anggaran'),
      formAnggaran: $('form-anggaran'),
    };
    muatData();

    $('uang-tambah').addEventListener('click', () => bukaForm(null));
    $('uang-bulan-sebelum').addEventListener('click', () => geserBulan(-1));
    $('uang-bulan-sesudah').addEventListener('click', () => geserBulan(1));
    el.bulanIni.addEventListener('click', () => {
      bulanAktif = Inti.hariIni().slice(0, 7);
      render();
    });

    // Klik di daftar: ubah atau hapus transaksi
    el.daftar.addEventListener('click', (e) => {
      const tombol = e.target.closest('[data-aksi]');
      if (!tombol) return;
      const t = transaksi.find((x) => x.id === tombol.dataset.id);
      if (!t) return;
      if (tombol.dataset.aksi === 'ubah') bukaForm(t);
      if (tombol.dataset.aksi === 'hapus') hapusTransaksi(t.id);
    });

    el.anggaran.addEventListener('click', (e) => {
      if (e.target.closest('[data-aksi="atur-anggaran"]')) bukaAnggaran();
    });

    // Ganti jenis (pengeluaran/pemasukan) -> ganti pilihan kategori
    el.form.addEventListener('change', (e) => {
      if (e.target.name === 'jenis') isiPilihanKategori(e.target.value, '');
    });
    el.form.elements.jumlah.addEventListener('input', () => { el.galat.hidden = true; });
    el.form.addEventListener('submit', simpanForm);
    el.tombolHapus.addEventListener('click', () => {
      const id = idDiubah;
      Inti.tutupDialog(el.dlg);
      hapusTransaksi(id);
    });
    el.formAnggaran.addEventListener('submit', simpanAnggaran);

    render();
  }

  function muatUlang() {
    muatData();
    render();
  }

  // Dipakai alat lain (Belanja) untuk membuka form dengan isian awal
  function bukaFormBaru(isian) {
    bukaForm(null, isian);
  }

  // Dipakai fitur ekspor CSV
  function semuaTransaksi() {
    return transaksi.map((t) => ({ ...t }));
  }

  function namaKategori(id) {
    return cariKategori(id).nama;
  }

  return { mulai, render, muatUlang, bukaFormBaru, semuaTransaksi, namaKategori };
})();
