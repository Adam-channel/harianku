/* ==============================================================
   HARIANKU · js/belanja.js
   Alat 3: Daftar Belanja

   Data di localStorage:
     "harianku:belanja" -> daftar barang

   Bentuk satu barang:
     { id, nama: "Telur", jumlah: 2, harga: 28000 (per satuan, 0 = belum diisi),
       diambil: true/false (sudah masuk keranjang), dibuat: 1730790000000 }
   ============================================================== */

const Belanja = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let el = {};

  let barang = [];
  let idDiubah = null;

  const subtotal = (b) => b.jumlah * b.harga;
  const jumlahTotal = (daftar) => daftar.reduce((s, b) => s + subtotal(b), 0);

  // Jumlah barang: bilangan bulat 1–999
  function bacaJumlah(nilai) {
    const n = Math.round(Number(nilai));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 999) : 1;
  }


  /* DATA ---------------------------------------------------------- */
  function muatData() {
    const mentah = Inti.muat('belanja', []);
    barang = (Array.isArray(mentah) ? mentah : [])
      .filter((b) => b && b.id && String(b.nama || '').trim())
      .map((b) => ({
        id: String(b.id),
        nama: String(b.nama).trim(),
        jumlah: bacaJumlah(b.jumlah),
        harga: Math.max(0, Math.round(Number(b.harga) || 0)),
        diambil: !!b.diambil,
        dibuat: Number(b.dibuat) || 0,
      }));
  }

  function simpanData() {
    Inti.simpan('belanja', barang);
  }


  /* TAMPILAN ------------------------------------------------------ */
  function render() {
    const belum = barang.filter((b) => !b.diambil);
    const sudah = barang.filter((b) => b.diambil);

    // Yang belum diambil di atas, yang sudah dicentang turun ke bawah
    Inti.jagaFokus(el.daftar, () => {
      el.daftar.innerHTML = barang.length
        ? [...belum, ...sudah].map(itemHtml).join('')
        : '<li class="kosong"><strong>Daftar belanja masih kosong</strong>Tambahkan barang yang mau dibeli di kotak di atas.</li>';
    });
    el.aksi.hidden = !sudah.length;
    el.bagikan.disabled = !barang.length;
    el.ringkas.textContent = barang.length
      ? `${barang.length} barang` + (belum.length ? ` · ${belum.length} belum dibeli` : ' · semua sudah di keranjang')
      : '';

    renderRingkasan(sudah);
  }

  // Bilah bawah: total di keranjang + tombol catat ke Uang
  function renderRingkasan(sudah) {
    el.ringkasan.hidden = !barang.length;
    if (!barang.length) return;

    const total = jumlahTotal(barang);
    const diKeranjang = jumlahTotal(sudah);
    const tanpaHarga = barang.filter((b) => !b.harga).length;
    const sub = [`dari perkiraan ${Inti.rupiah(total)}`, `${sudah.length}/${barang.length} barang`];
    if (tanpaHarga) sub.push(`${tanpaHarga} tanpa harga`);

    el.ringkasan.innerHTML = `
      <div class="ringkasan-bawah__teks">
        <span class="ringkasan-bawah__label">Di keranjang</span>
        <span class="ringkasan-bawah__nilai">${Inti.rupiah(diKeranjang)}</span>
        <span class="ringkasan-bawah__sub">${sub.join(' · ')}</span>
      </div>
      <button type="button" class="tombol tombol--utama tombol--kecil" data-aksi="catat" ${sudah.length ? '' : 'disabled'}
        title="${sudah.length ? 'Isi form Catatan Uang dengan total barang yang sudah dicentang' : 'Centang barang yang sudah dibeli dulu'}">Catat ke Uang</button>`;
  }

  function itemHtml(b) {
    const id = Inti.esc(b.id);
    const rincian = b.harga
      ? `${b.jumlah} × ${Inti.rupiah(b.harga)}`
      : (b.jumlah > 1 ? `Jumlah ${b.jumlah}` : '');
    return `<li class="baris${b.diambil ? ' is-selesai' : ''}">
      <label class="cek cek--kotak">
        <input type="checkbox" data-aksi="centang" data-id="${id}" ${b.diambil ? 'checked' : ''}>
        <span class="cek__tanda" aria-hidden="true">${Inti.ikon('centang')}</span>
        <span class="sr">Sudah di keranjang: ${Inti.esc(b.nama)}</span>
      </label>
      <button type="button" class="baris__utama" data-aksi="ubah" data-id="${id}">
        <span class="baris__teks">
          <span class="baris__judul">${Inti.esc(b.nama)}</span>
          ${rincian ? `<span class="baris__sub">${rincian}</span>` : ''}
        </span>
        ${b.harga ? `<span class="baris__nilai">${Inti.rupiah(subtotal(b))}</span>` : ''}
      </button>
      <button type="button" class="tombol-ikon baris__hapus" data-aksi="hapus" data-id="${id}" aria-label="Hapus ${Inti.esc(b.nama)}">${Inti.ikon('sampah')}</button>
    </li>`;
  }


  /* AKSI ---------------------------------------------------------- */
  function tambah(e) {
    e.preventDefault();
    const f = el.form.elements;
    const nama = f.nama.value.trim();
    if (!nama) {
      f.nama.focus();
      Inti.toast('Tulis nama barangnya dulu.');
      return;
    }
    barang.push({
      id: Inti.buatId(),
      nama,
      jumlah: bacaJumlah(f.jumlah.value),
      harga: Inti.bacaRupiah(f.harga.value),
      diambil: false,
      dibuat: Date.now(),
    });
    simpanData();
    f.nama.value = '';
    f.jumlah.value = '1';
    f.harga.value = '';
    render();
    f.nama.focus();   // siap mengetik barang berikutnya
    Inti.toast(`${nama} ditambahkan`);
  }

  function centang(id, diambil) {
    const b = barang.find((x) => x.id === id);
    if (!b) return;
    b.diambil = diambil;
    simpanData();
    render();
  }

  function hapusBarang(id) {
    const posisi = barang.findIndex((b) => b.id === id);
    if (posisi < 0) return;
    const [lama] = barang.splice(posisi, 1);
    simpanData();
    render();
    Inti.toast(`${lama.nama} dihapus`, {
      aksi: 'Urungkan',
      onAksi: () => { barang.splice(Math.min(posisi, barang.length), 0, lama); simpanData(); render(); },
    });
  }

  function hapusYangDiambil() {
    const cadangan = barang.slice();
    const jumlah = barang.filter((b) => b.diambil).length;
    if (!jumlah) return;
    barang = barang.filter((b) => !b.diambil);
    simpanData();
    render();
    Inti.toast(`${jumlah} barang dihapus dari daftar`, {
      aksi: 'Urungkan',
      onAksi: () => { barang = cadangan; simpanData(); render(); },
    });
  }

  // Buka form Catatan Uang dengan total barang yang sudah dicentang
  function catatKeUang() {
    const sudah = barang.filter((b) => b.diambil);
    if (!sudah.length) return;
    const nama = sudah.map((b) => b.nama);
    const ringkas = nama.length > 3 ? `${nama.slice(0, 3).join(', ')} +${nama.length - 3} lainnya` : nama.join(', ');
    location.hash = 'uang';
    Uang.bukaFormBaru({
      jenis: 'keluar',
      kategori: 'belanja',
      jumlah: jumlahTotal(sudah),
      tanggal: Inti.hariIni(),
      catatan: ('Belanja: ' + ringkas).slice(0, 80),
    });
  }

  // Kirim daftar ke WhatsApp, misalnya untuk titip belanja (*teks* = tebal di WhatsApp)
  function bagikan() {
    const belum = barang.filter((b) => !b.diambil);
    const isi = belum.length ? belum : barang;
    if (!isi.length) return;
    const baris = isi.map((b) => `- ${b.nama}${b.jumlah > 1 ? ` (${b.jumlah})` : ''}`);
    const total = jumlahTotal(isi);
    const teks = `*Daftar belanja*\n${baris.join('\n')}${total ? `\n\nPerkiraan: ${Inti.rupiah(total)}` : ''}`;
    Inti.bagikanTeks(teks, 'Daftar belanja');
  }

  // Dialog ubah barang
  function bukaUbah(b) {
    idDiubah = b.id;
    const f = el.formUbah.elements;
    f.nama.value = b.nama;
    f.jumlah.value = b.jumlah;
    Inti.isiRupiah(f.harga, b.harga);
    f.diambil.checked = b.diambil;
    el.galatUbah.hidden = true;
    Inti.bukaDialog(el.dlg);
  }

  function simpanUbah(e) {
    e.preventDefault();
    const b = barang.find((x) => x.id === idDiubah);
    if (!b) { Inti.tutupDialog(el.dlg); return; }
    const f = el.formUbah.elements;
    const nama = f.nama.value.trim();
    if (!nama) {
      el.galatUbah.hidden = false;
      f.nama.focus();
      return;
    }
    b.nama = nama;
    b.jumlah = bacaJumlah(f.jumlah.value);
    b.harga = Inti.bacaRupiah(f.harga.value);
    b.diambil = f.diambil.checked;
    simpanData();
    Inti.tutupDialog(el.dlg);
    render();
    Inti.toast('Perubahan disimpan');
  }


  /* MULAI --------------------------------------------------------- */
  function mulai() {
    el = {
      form: $('form-belanja'),
      ringkas: $('belanja-ringkas'),
      ringkasan: $('belanja-ringkasan'),
      daftar: $('belanja-daftar'),
      aksi: $('belanja-aksi'),
      bagikan: $('belanja-bagikan'),
      dlg: $('dlg-belanja'),
      formUbah: $('form-ubah-belanja'),
      galatUbah: $('ubah-belanja-galat'),
    };
    muatData();

    el.form.addEventListener('submit', tambah);

    // Tombol [-] dan [+] di samping jumlah
    el.form.addEventListener('click', (e) => {
      const tombol = e.target.closest('[data-langkah]');
      if (!tombol) return;
      const isian = el.form.elements.jumlah;
      isian.value = Math.min(999, Math.max(1, bacaJumlah(isian.value) + Number(tombol.dataset.langkah)));
    });

    el.bagikan.addEventListener('click', bagikan);
    $('belanja-hapus-diambil').addEventListener('click', hapusYangDiambil);

    el.ringkasan.addEventListener('click', (e) => {
      if (e.target.closest('[data-aksi="catat"]')) catatKeUang();
    });

    el.daftar.addEventListener('change', (e) => {
      if (e.target.dataset.aksi === 'centang') centang(e.target.dataset.id, e.target.checked);
    });

    el.daftar.addEventListener('click', (e) => {
      const tombol = e.target.closest('button[data-aksi]');
      if (!tombol) return;
      const b = barang.find((x) => x.id === tombol.dataset.id);
      if (!b) return;
      if (tombol.dataset.aksi === 'ubah') bukaUbah(b);
      if (tombol.dataset.aksi === 'hapus') hapusBarang(b.id);
    });

    el.formUbah.addEventListener('submit', simpanUbah);
    el.formUbah.elements.nama.addEventListener('input', () => { el.galatUbah.hidden = true; });
    $('ubah-belanja-hapus').addEventListener('click', () => {
      const id = idDiubah;
      Inti.tutupDialog(el.dlg);
      hapusBarang(id);
    });

    render();
  }

  function muatUlang() {
    muatData();
    render();
  }

  return { mulai, render, muatUlang };
})();
