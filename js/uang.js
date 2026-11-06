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
     Silakan ubah nama/warna atau tambah baris baru. "warna" dipakai
     untuk titik penanda dan bar per kategori.
     Jangan mengganti "id" yang sudah terpakai, karena id itulah yang
     tersimpan di data transaksi. */
  const KATEGORI = {
    keluar: [
      { id: 'makan',       nama: 'Makan & minum',     warna: '#D9773B' },
      { id: 'transport',   nama: 'Transportasi',      warna: '#3D7BD9' },
      { id: 'belanja',     nama: 'Belanja harian',    warna: '#2E9E6B' },
      { id: 'tagihan',     nama: 'Tagihan & cicilan', warna: '#7A5CC7' },
      { id: 'pulsa',       nama: 'Pulsa & internet',  warna: '#2A9DB5' },
      { id: 'kesehatan',   nama: 'Kesehatan',         warna: '#D64F4F' },
      { id: 'hiburan',     nama: 'Hiburan',           warna: '#C9558F' },
      { id: 'pendidikan',  nama: 'Pendidikan',        warna: '#D4A02A' },
      { id: 'sedekah',     nama: 'Sedekah & hadiah',  warna: '#6F9E3A' },
      { id: 'lain-keluar', nama: 'Lainnya',           warna: '#8A94A6' },
    ],
    masuk: [
      { id: 'gaji',        nama: 'Gaji',               warna: '#2E9E6B' },
      { id: 'usaha',       nama: 'Usaha & penjualan',  warna: '#3D7BD9' },
      { id: 'bonus',       nama: 'Bonus & hadiah',     warna: '#D4A02A' },
      { id: 'kiriman',     nama: 'Kiriman / transfer', warna: '#7A5CC7' },
      { id: 'lain-masuk',  nama: 'Lainnya',            warna: '#8A94A6' },
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
      || { id, nama: 'Lainnya', warna: '#8A94A6' };
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
    const bulanBerjalan = bulanAktif === bulanIni;
    el.bulanLabel.textContent = Inti.namaBulan(bulanAktif);
    el.bulanIni.hidden = bulanBerjalan;
    el.sisaLabel.textContent = bulanBerjalan ? 'Sisa bulan ini' : 'Sisa ' + Inti.namaBulan(bulanAktif);

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
    el.sisa.classList.toggle('nilai-minus', sisa < 0);

    renderAnggaran(keluar, bulanBerjalan);
    renderKategori(diBulan, keluar);
    Inti.jagaFokus(el.daftar, () => renderDaftar(diBulan));
  }

  function renderAnggaran(keluar, bulanBerjalan) {
    if (!anggaran) {
      el.anggaran.className = 'anggaran anggaran--kosong';
      el.anggaran.innerHTML = `<span>Belum ada batas anggaran bulanan.</span>
        <button type="button" class="tautan" data-aksi="atur-anggaran">Atur anggaran</button>`;
      return;
    }

    const persen = Math.round((keluar / anggaran) * 100);
    const sisa = anggaran - keluar;
    const warna = persen >= 100 ? ' bar--merah' : persen >= 80 ? ' bar--kuning' : '';

    let keterangan = sisa >= 0
      ? `<strong>${Inti.rupiah(keluar)}</strong> dari ${Inti.rupiah(anggaran)} terpakai (${persen}%).`
      : `Lewat <strong>${Inti.rupiah(-sisa)}</strong> dari batas ${Inti.rupiah(anggaran)}.`;

    // Jatah per hari hanya dihitung untuk bulan yang sedang berjalan
    if (bulanBerjalan && sisa > 0) {
      const sekarang = new Date();
      const hariTerakhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 0).getDate();
      const hariTersisa = hariTerakhir - sekarang.getDate() + 1;   // termasuk hari ini
      keterangan += ` Sisa jatah <strong>${Inti.rupiah(Math.floor(sisa / hariTersisa))}</strong> per hari sampai akhir bulan.`;
    }

    el.anggaran.className = 'anggaran';
    el.anggaran.innerHTML = `
      <div class="anggaran__atas">
        <span class="anggaran__judul">Anggaran bulanan</span>
        <button type="button" class="tautan" data-aksi="atur-anggaran">Ubah</button>
      </div>
      <div class="bar${warna}" role="progressbar" aria-label="Anggaran terpakai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(persen, 100)}">
        <span style="width:${Math.min(persen, 100)}%"></span>
      </div>
      <p class="anggaran__ket">${keterangan}</p>`;
  }

  function renderKategori(diBulan, totalKeluar) {
    const per = new Map();
    for (const t of diBulan) {
      if (t.jenis === 'keluar') per.set(t.kategori, (per.get(t.kategori) || 0) + t.jumlah);
    }
    if (!per.size) {
      el.perKategori.innerHTML = '<p class="kosong kosong--polos">Belum ada pengeluaran di bulan ini.</p>';
      return;
    }

    const urut = [...per].sort((a, b) => b[1] - a[1]).map(([id, jumlah]) => ({ k: cariKategori(id), jumlah, persen: (jumlah / totalKeluar) * 100 }));
    const segmen = urut.map((u) => `<span style="width:${u.persen.toFixed(2)}%;background:${u.k.warna}"></span>`).join('');
    const legenda = urut.map((u) => `<li>
        <span class="titik" style="background:${u.k.warna}" aria-hidden="true"></span>
        <span class="legenda__nama">${Inti.esc(u.k.nama)}</span>
        <span class="legenda__nilai">${Inti.rupiah(u.jumlah)}</span>
        <span class="legenda__persen">${Math.round(u.persen)}%</span>
      </li>`).join('');

    el.perKategori.innerHTML = `<div class="bar-tumpuk" aria-hidden="true">${segmen}</div><ul class="legenda">${legenda}</ul>`;
  }

  function renderDaftar(diBulan) {
    if (!diBulan.length) {
      el.daftar.innerHTML = `<div class="kosong">
          <strong>Belum ada transaksi di ${Inti.esc(Inti.namaBulan(bulanAktif))}</strong>
          Semua catatan tersimpan di perangkat ini.
          <div><button type="button" class="tombol tombol--kedua tombol--kecil" data-aksi="tambah">Catat transaksi</button></div>
        </div>`;
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
      html += `<div class="grup"><span>${Inti.esc(Inti.labelHari(tanggal))}</span>${keluarHari ? `<span>−${Inti.rupiah(keluarHari)}</span>` : ''}</div>`;
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
    return `<li class="baris">
      <button type="button" class="baris__utama" data-aksi="ubah" data-id="${id}">
        <span class="titik" style="background:${k.warna}" aria-hidden="true"></span>
        <span class="baris__teks">
          <span class="baris__judul">${Inti.esc(judul)}</span>
          <span class="baris__sub">${Inti.esc(sub)}</span>
        </span>
        <span class="baris__nilai${masuk ? ' nilai-masuk' : ''}">${masuk ? '+' : '−'}${Inti.rupiah(t.jumlah)}</span>
      </button>
      <button type="button" class="tombol-ikon baris__hapus" data-aksi="hapus" data-id="${id}" aria-label="Hapus ${Inti.esc(judul)} ${Inti.rupiah(t.jumlah)}">${Inti.ikon('sampah')}</button>
    </li>`;
  }


  /* FORM TRANSAKSI (tambah & ubah memakai dialog yang sama) ------- */
  function isiPilihanKategori(jenis, terpilih) {
    const pilihan = KATEGORI[jenis] || KATEGORI.keluar;
    const select = el.form.elements.kategori;
    select.innerHTML = pilihan.map((k) => `<option value="${Inti.esc(k.id)}">${Inti.esc(k.nama)}</option>`).join('');
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
      sisaLabel: $('uang-sisa-label'),
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

    // Klik di daftar: ubah, hapus, atau tombol "Catat transaksi" saat kosong
    el.daftar.addEventListener('click', (e) => {
      const tombol = e.target.closest('[data-aksi]');
      if (!tombol) return;
      if (tombol.dataset.aksi === 'tambah') { bukaForm(null); return; }
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
