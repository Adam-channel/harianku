/* ==============================================================
   HARIANKU · js/patungan.js
   Alat 4: Kalkulator Patungan (split bill)

   Dua cara membagi:
     - "rata"  : total tagihan dibagi rata ke sejumlah orang
     - "rinci" : tiap orang membayar sesuai pesanannya, ditambah
                 servis/pajak/diskon sesuai porsi, ongkir dibagi rata

   Data di localStorage:
     "harianku:patungan" -> satu objek, lihat keadaanBawaan() di bawah
   ============================================================== */

const Patungan = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let el = {};
  let s = null;   // keadaan patungan yang sedang dikerjakan

  // Keadaan awal. orangLama dipakai saat "Mulai baru" supaya nama orang tetap ada.
  function keadaanBawaan(orangLama) {
    return {
      mode: 'rata',
      judul: '',
      rata: { total: 0, orang: 2, bulatkan: 0 },
      orang: orangLama || [
        { id: Inti.buatId(), nama: 'Orang 1' },
        { id: Inti.buatId(), nama: 'Orang 2' },
      ],
      pesanan: [],      // { id, nama, harga, ikut: [id orang yang memesan] }
      servis: 0,        // persen
      pajak: 0,         // persen
      diskon: 0,        // Rupiah
      biayaLain: 0,     // Rupiah (ongkir, parkir)
    };
  }

  const angkaAman = (v) => Math.max(0, Math.round(Number(v) || 0));
  const batas = (n, min, maks) => Math.min(maks, Math.max(min, n));
  const PEMBULATAN = [0, 500, 1000, 5000];

  function namaOrang(o, i) {
    return (o.nama || '').trim() || `Orang ${i + 1}`;
  }


  /* DATA ---------------------------------------------------------- */
  function muatData() {
    const m = Inti.muat('patungan', null);
    const b = keadaanBawaan();
    if (!m || typeof m !== 'object') { s = b; return; }
    const r = m.rata && typeof m.rata === 'object' ? m.rata : {};
    s = {
      mode: m.mode === 'rinci' ? 'rinci' : 'rata',
      judul: String(m.judul || '').slice(0, 60),
      rata: {
        total: angkaAman(r.total),
        orang: batas(Math.round(Number(r.orang)) || 2, 1, 100),
        bulatkan: PEMBULATAN.includes(Number(r.bulatkan)) ? Number(r.bulatkan) : 0,
      },
      orang: Array.isArray(m.orang)
        ? m.orang.filter((o) => o && o.id).map((o) => ({ id: String(o.id), nama: String(o.nama ?? '').slice(0, 30) }))
        : b.orang,
      pesanan: Array.isArray(m.pesanan)
        ? m.pesanan.filter((p) => p && p.id).map((p) => ({
          id: String(p.id),
          nama: String(p.nama ?? '').slice(0, 60),
          harga: angkaAman(p.harga),
          ikut: Array.isArray(p.ikut) ? p.ikut.map(String) : [],
        }))
        : [],
      servis: batas(Number(m.servis) || 0, 0, 100),
      pajak: batas(Number(m.pajak) || 0, 0, 100),
      diskon: angkaAman(m.diskon),
      biayaLain: angkaAman(m.biayaLain),
    };
    if (!s.orang.length) s.orang = b.orang;
  }

  function simpanData() {
    Inti.simpan('patungan', s);
  }


  /* HITUNGAN ------------------------------------------------------ */
  function hitungRata() {
    const { total, orang, bulatkan } = s.rata;
    const per = total / orang;
    const bayar = bulatkan ? Math.ceil(per / bulatkan) * bulatkan : Math.ceil(per);
    return { total, orang, bayar, terkumpul: bayar * orang, lebih: bayar * orang - total };
  }

  function hitungRinci() {
    const peta = new Map(s.orang.map((o, i) => [o.id, { id: o.id, nama: namaOrang(o, i), subtotal: 0, item: [] }]));
    let subtotal = 0;
    let belumDibagi = 0;

    for (const p of s.pesanan) {
      if (!p.harga) continue;
      const ikut = p.ikut.filter((id) => peta.has(id));
      if (!ikut.length) { belumDibagi += p.harga; continue; }
      subtotal += p.harga;
      const namaItem = (p.nama.trim() || 'Pesanan') + (ikut.length > 1 ? ` (bagi ${ikut.length})` : '');
      for (const id of ikut) {
        const o = peta.get(id);
        o.subtotal += p.harga / ikut.length;
        o.item.push(namaItem);
      }
    }

    // Di Indonesia, pajak resto (PB1) umumnya dihitung dari subtotal + servis
    const servis = subtotal * s.servis / 100;
    const pajak = (subtotal + servis) * s.pajak / 100;
    const diskon = Math.min(s.diskon, subtotal + servis + pajak);
    const orang = [...peta.values()];
    const pemesan = orang.filter((o) => o.subtotal > 0);
    const biayaLain = pemesan.length ? s.biayaLain : 0;
    const total = subtotal + servis + pajak - diskon + biayaLain;

    for (const o of orang) {
      const porsi = subtotal ? o.subtotal / subtotal : 0;
      o.tepat = o.subtotal + (servis + pajak - diskon) * porsi + (o.subtotal > 0 ? biayaLain / pemesan.length : 0);
    }

    // Bulatkan ke rupiah penuh tanpa mengubah total (metode sisa terbesar)
    const totalBulat = Math.round(total);
    let sisa = totalBulat;
    for (const o of orang) { o.bayar = Math.floor(o.tepat + 1e-6); sisa -= o.bayar; }
    const urut = orang.filter((o) => o.tepat > 0).sort((a, b) => (b.tepat - b.bayar) - (a.tepat - a.bayar));
    for (let i = 0; sisa > 0 && urut.length && i < 1000; i++) { urut[i % urut.length].bayar++; sisa--; }
    for (let i = 0; sisa < 0 && urut.length && i < 1000; i++) {
      const o = urut[urut.length - 1 - (i % urut.length)];
      if (o.bayar > 0) { o.bayar--; sisa++; }
    }

    return { orang, subtotal, servis, pajak, diskon, biayaLain, total: totalBulat, belumDibagi };
  }


  /* TAMPILAN ------------------------------------------------------ */
  // Isi semua kotak dari data (dipakai saat halaman dimuat / data dipulihkan)
  function renderSemua() {
    el.judul.value = s.judul;
    Inti.isiRupiah(el.rataTotal, s.rata.total);
    el.rataOrang.value = s.rata.orang;
    el.rataBulatkan.value = String(s.rata.bulatkan);
    el.servis.value = s.servis ? Inti.angka(s.servis) : '';
    el.pajak.value = s.pajak ? Inti.angka(s.pajak) : '';
    Inti.isiRupiah(el.diskon, s.diskon);
    Inti.isiRupiah(el.lain, s.biayaLain);
    renderMode();
    renderOrang();
    renderPesanan();
    renderHasil();
  }

  function renderMode() {
    el.mode.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode)));
    el.panelRata.hidden = s.mode !== 'rata';
    el.panelRinci.hidden = s.mode !== 'rinci';
  }

  function renderOrang() {
    el.orang.innerHTML = s.orang.map((o, i) => {
      const id = Inti.esc(o.id);
      return `<li>
        <span class="nomor" aria-hidden="true">${i + 1}</span>
        <label class="sr" for="orang-${id}">Nama orang ke-${i + 1}</label>
        <input id="orang-${id}" data-orang="${id}" value="${Inti.esc(o.nama)}" maxlength="30" placeholder="Orang ${i + 1}" autocomplete="off">
        <button type="button" class="tombol-ikon tombol-ikon--bahaya" data-hapus-orang="${id}" aria-label="Hapus ${Inti.esc(namaOrang(o, i))}" ${s.orang.length <= 1 ? 'disabled' : ''}>${Inti.ikon('sampah')}</button>
      </li>`;
    }).join('');
  }

  function chipsHtml(p) {
    const semua = s.orang.every((o) => p.ikut.includes(o.id));
    return s.orang.map((o, i) => `<button type="button" class="chip" data-chip="${Inti.esc(o.id)}" aria-pressed="${p.ikut.includes(o.id)}">${Inti.esc(namaOrang(o, i))}</button>`).join('')
      + (s.orang.length > 1 ? `<button type="button" class="chip chip--semua" data-chip="semua" aria-pressed="${semua}">Semua</button>` : '');
  }

  function renderPesanan() {
    if (!s.pesanan.length) {
      el.pesanan.innerHTML = '<li class="kosong kosong--kecil">Belum ada pesanan. Tambahkan menu yang dipesan satu per satu.</li>';
      return;
    }
    el.pesanan.innerHTML = s.pesanan.map((p, i) => {
      const id = Inti.esc(p.id);
      return `<li class="pesanan" data-pesanan="${id}">
        <div class="pesanan__baris">
          <div class="pesanan__nama">
            <label class="sr" for="pesanan-nama-${id}">Nama pesanan ke-${i + 1}</label>
            <input id="pesanan-nama-${id}" data-isi="nama" value="${Inti.esc(p.nama)}" maxlength="60" placeholder="Menu, contoh: Nasi goreng" autocomplete="off">
          </div>
          <div class="pesanan__harga isian-rupiah">
            <span aria-hidden="true">Rp</span>
            <label class="sr" for="pesanan-harga-${id}">Harga pesanan ke-${i + 1}</label>
            <input id="pesanan-harga-${id}" data-isi="harga" data-rupiah inputmode="numeric" value="${p.harga ? Inti.angka(p.harga) : ''}" placeholder="Harga" autocomplete="off">
          </div>
          <button type="button" class="tombol-ikon tombol-ikon--bahaya pesanan__hapus" data-aksi="hapus-pesanan" aria-label="Hapus pesanan ke-${i + 1}">${Inti.ikon('sampah')}</button>
        </div>
        <div class="chips" role="group" aria-label="Siapa yang memesan" data-chips>${chipsHtml(p)}</div>
      </li>`;
    }).join('');
  }

  // Gambar ulang tombol nama di semua pesanan (setelah daftar orang berubah)
  function renderChips() {
    el.pesanan.querySelectorAll('[data-pesanan]').forEach((li) => {
      const p = s.pesanan.find((x) => x.id === li.dataset.pesanan);
      if (p) li.querySelector('[data-chips]').innerHTML = chipsHtml(p);
    });
  }

  // Perbarui status tombol nama di satu pesanan tanpa menggambar ulang (fokus tidak hilang)
  function perbaruiChips(li, p) {
    const semua = s.orang.every((o) => p.ikut.includes(o.id));
    li.querySelectorAll('[data-chip]').forEach((b) => {
      const tekan = b.dataset.chip === 'semua' ? semua : p.ikut.includes(b.dataset.chip);
      b.setAttribute('aria-pressed', String(tekan));
    });
  }

  function renderHasil() {
    if (s.mode === 'rata') renderHasilRata();
    else renderHasilRinci();
  }

  function renderHasilRata() {
    if (!s.rata.total) {
      el.hasil.innerHTML = '<h3 class="kartu__judul">Hasil</h3><p class="kosong kosong--kecil">Isi total tagihan untuk melihat bagian tiap orang.</p>';
      return;
    }
    const h = hitungRata();
    el.hasil.innerHTML = `
      <h3 class="kartu__judul">Hasil</h3>
      <span class="label-kecil">Setiap orang membayar</span>
      <p class="hasil__besar">${Inti.rupiah(h.bayar)}</p>
      <dl class="rincian">
        <div><dt>Total tagihan</dt><dd>${Inti.rupiah(h.total)}</dd></div>
        <div><dt>Dibagi</dt><dd>${h.orang} orang</dd></div>
        ${h.lebih ? `<div><dt>Terkumpul</dt><dd>${Inti.rupiah(h.terkumpul)}</dd></div>
        <div><dt>Kelebihan karena pembulatan</dt><dd>${Inti.rupiah(h.lebih)}</dd></div>` : ''}
      </dl>`;
  }

  function renderHasilRinci() {
    const h = hitungRinci();
    if (!h.subtotal && !h.belumDibagi) {
      el.hasil.innerHTML = '<h3 class="kartu__judul">Hasil</h3><p class="kosong kosong--kecil">Isi daftar orang dan pesanan, hasilnya muncul di sini.</p>';
      return;
    }
    const daftar = h.orang.map((o) => `<li>
        <div>
          <span class="hasil__nama">${Inti.esc(o.nama)}</span>
          <span class="hasil__rinci">${o.item.length ? Inti.esc(o.item.join(', ')) : 'Belum ada pesanan'}</span>
        </div>
        <strong class="hasil__nilai">${Inti.rupiah(o.bayar)}</strong>
      </li>`).join('');

    const baris = (label, nilai) => `<div><dt>${label}</dt><dd>${nilai}</dd></div>`;
    el.hasil.innerHTML = `
      <h3 class="kartu__judul">Yang harus dibayar</h3>
      <ul class="hasil__daftar">${daftar}</ul>
      <dl class="rincian">
        ${baris('Subtotal pesanan', Inti.rupiah(h.subtotal))}
        ${h.servis ? baris(`Servis ${Inti.angka(s.servis)}%`, Inti.rupiah(h.servis)) : ''}
        ${h.pajak ? baris(`Pajak ${Inti.angka(s.pajak)}%`, Inti.rupiah(h.pajak)) : ''}
        ${h.diskon ? baris('Diskon / promo', '−' + Inti.rupiah(h.diskon)) : ''}
        ${h.biayaLain ? baris('Ongkir / parkir', Inti.rupiah(h.biayaLain)) : ''}
        <div class="rincian__total"><dt>Total</dt><dd>${Inti.rupiah(h.total)}</dd></div>
      </dl>
      ${h.belumDibagi ? `<p class="peringatan-kecil">${Inti.rupiah(h.belumDibagi)} pesanan belum dipilih pemesannya, jadi belum ikut dihitung.</p>` : ''}`;
  }

  // Teks ringkasan untuk dibagikan ke grup WhatsApp
  function teksBagikan() {
    const judul = s.judul.trim() || 'Patungan';
    const tanggal = Inti.tanggalPanjang(Inti.hariIni());
    if (s.mode === 'rata') {
      if (!s.rata.total) return '';
      const h = hitungRata();
      return `🧾 ${judul}\n${tanggal}\n\nTotal ${Inti.rupiah(h.total)} dibagi ${h.orang} orang.\nPer orang: ${Inti.rupiah(h.bayar)}`;
    }
    const h = hitungRinci();
    if (!h.subtotal) return '';
    const baris = h.orang
      .filter((o) => o.bayar > 0)
      .map((o) => `• ${o.nama}: ${Inti.rupiah(o.bayar)}${o.item.length ? ` — ${o.item.join(', ')}` : ''}`);
    const tambahan = [
      h.servis ? `servis ${Inti.angka(s.servis)}%` : '',
      h.pajak ? `pajak ${Inti.angka(s.pajak)}%` : '',
      h.diskon ? `diskon ${Inti.rupiah(h.diskon)}` : '',
      h.biayaLain ? `ongkir/parkir ${Inti.rupiah(h.biayaLain)}` : '',
    ].filter(Boolean);
    return `🧾 ${judul}\n${tanggal}\n\n${baris.join('\n')}\n\nTotal: ${Inti.rupiah(h.total)}`
      + (tambahan.length ? `\n(sudah termasuk ${tambahan.join(', ')})` : '');
  }


  /* AKSI ---------------------------------------------------------- */
  function ubahJumlahOrang(selisih) {
    s.rata.orang = batas(s.rata.orang + selisih, 1, 100);
    el.rataOrang.value = s.rata.orang;
    simpanData();
    renderHasil();
  }

  function tambahOrang() {
    if (s.orang.length >= 30) { Inti.toast('Maksimal 30 orang.'); return; }
    const o = { id: Inti.buatId(), nama: `Orang ${s.orang.length + 1}` };
    s.orang.push(o);
    simpanData();
    renderOrang();
    renderChips();
    renderHasil();
    const input = el.orang.querySelector(`[data-orang="${CSS.escape(o.id)}"]`);
    if (input) { input.focus(); input.select(); }
  }

  function hapusOrang(id) {
    if (s.orang.length <= 1) return;
    const i = s.orang.findIndex((o) => o.id === id);
    if (i < 0) return;
    const cadangan = JSON.stringify(s);
    const nama = namaOrang(s.orang[i], i);
    s.orang.splice(i, 1);
    s.pesanan.forEach((p) => { p.ikut = p.ikut.filter((x) => x !== id); });
    simpanData();
    renderOrang();
    renderChips();
    renderHasil();
    Inti.toast(`${nama} dihapus`, {
      aksi: 'Urungkan',
      onAksi: () => { s = JSON.parse(cadangan); simpanData(); renderSemua(); },
    });
  }

  function tambahPesanan() {
    if (s.pesanan.length >= 100) { Inti.toast('Maksimal 100 pesanan.'); return; }
    const p = { id: Inti.buatId(), nama: '', harga: 0, ikut: s.orang.length === 1 ? [s.orang[0].id] : [] };
    s.pesanan.push(p);
    simpanData();
    renderPesanan();
    renderHasil();
    const input = el.pesanan.querySelector(`[data-pesanan="${CSS.escape(p.id)}"] [data-isi="nama"]`);
    if (input) input.focus();
  }

  function hapusPesanan(id) {
    const i = s.pesanan.findIndex((p) => p.id === id);
    if (i < 0) return;
    const cadangan = JSON.stringify(s);
    s.pesanan.splice(i, 1);
    simpanData();
    renderPesanan();
    renderHasil();
    Inti.toast('Pesanan dihapus', {
      aksi: 'Urungkan',
      onAksi: () => { s = JSON.parse(cadangan); simpanData(); renderSemua(); },
    });
  }

  async function mulaiBaru() {
    const ok = await Inti.konfirmasi({
      judul: 'Mulai patungan baru?',
      pesan: 'Total, pesanan, dan biaya tambahan akan dikosongkan. Daftar nama orang tetap disimpan.',
      ya: 'Mulai baru',
      bahaya: false,
    });
    if (!ok) return;
    const mode = s.mode;
    s = keadaanBawaan(s.orang);
    s.mode = mode;
    simpanData();
    renderSemua();
    Inti.toast('Patungan dikosongkan');
  }


  /* MULAI --------------------------------------------------------- */
  function mulai() {
    el = {
      judul: $('patungan-judul'),
      mode: $('patungan-mode'),
      panelRata: $('patungan-panel-rata'),
      panelRinci: $('patungan-panel-rinci'),
      rataTotal: $('rata-total'),
      rataOrang: $('rata-orang'),
      rataBulatkan: $('rata-bulatkan'),
      orang: $('patungan-orang'),
      pesanan: $('patungan-pesanan'),
      servis: $('patungan-servis'),
      pajak: $('patungan-pajak'),
      diskon: $('patungan-diskon'),
      lain: $('patungan-lain'),
      hasil: $('patungan-hasil'),
    };
    muatData();

    // Cara membagi & judul
    el.mode.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      s.mode = b.dataset.mode;
      simpanData();
      renderMode();
      renderHasil();
    });
    el.judul.addEventListener('input', () => { s.judul = el.judul.value; simpanData(); });

    // Bagi rata
    el.rataTotal.addEventListener('input', () => { s.rata.total = Inti.bacaRupiah(el.rataTotal.value); simpanData(); renderHasil(); });
    el.rataOrang.addEventListener('input', () => {
      const n = Math.round(Number(el.rataOrang.value));
      if (n >= 1) { s.rata.orang = Math.min(n, 100); simpanData(); renderHasil(); }
    });
    el.rataOrang.addEventListener('change', () => { el.rataOrang.value = s.rata.orang; });   // rapikan isian kosong
    $('rata-kurang').addEventListener('click', () => ubahJumlahOrang(-1));
    $('rata-tambah').addEventListener('click', () => ubahJumlahOrang(1));
    el.rataBulatkan.addEventListener('change', () => { s.rata.bulatkan = Number(el.rataBulatkan.value) || 0; simpanData(); renderHasil(); });

    // Daftar orang
    $('patungan-tambah-orang').addEventListener('click', tambahOrang);
    el.orang.addEventListener('input', (e) => {
      const i = s.orang.findIndex((x) => x.id === e.target.dataset.orang);
      if (i < 0) return;
      s.orang[i].nama = e.target.value;
      simpanData();
      // label tombol hapus ikut nama baru (untuk pembaca layar)
      const tombolHapus = e.target.parentElement.querySelector('[data-hapus-orang]');
      if (tombolHapus) tombolHapus.setAttribute('aria-label', 'Hapus ' + namaOrang(s.orang[i], i));
      renderChips();
      renderHasil();
    });
    // Nama bawaan "Orang 1" langsung terpilih saat diketuk pertama kali, jadi tinggal ketik nama baru.
    // (Dipilih saat "click", bukan "focus", karena di Chrome lepasnya tombol mouse membatalkan pilihan.)
    let baruDifokus = null;
    el.orang.addEventListener('focusin', (e) => { baruDifokus = e.target; });
    el.orang.addEventListener('click', (e) => {
      const input = e.target;
      if (input === baruDifokus && input.dataset.orang && /^Orang \d+$/.test(input.value)) {
        input.setSelectionRange(0, input.value.length);
      }
      baruDifokus = null;
      const b = e.target.closest('[data-hapus-orang]');
      if (b) hapusOrang(b.dataset.hapusOrang);
    });

    // Daftar pesanan
    $('patungan-tambah-pesanan').addEventListener('click', tambahPesanan);
    el.pesanan.addEventListener('input', (e) => {
      const li = e.target.closest('[data-pesanan]');
      const p = li && s.pesanan.find((x) => x.id === li.dataset.pesanan);
      if (!p) return;
      if (e.target.dataset.isi === 'nama') p.nama = e.target.value;
      if (e.target.dataset.isi === 'harga') p.harga = Inti.bacaRupiah(e.target.value);
      simpanData();
      renderHasil();
    });
    el.pesanan.addEventListener('click', (e) => {
      const li = e.target.closest('[data-pesanan]');
      const p = li && s.pesanan.find((x) => x.id === li.dataset.pesanan);
      if (!p) return;
      const chip = e.target.closest('[data-chip]');
      if (chip) {
        const id = chip.dataset.chip;
        if (id === 'semua') {
          const semua = s.orang.every((o) => p.ikut.includes(o.id));
          p.ikut = semua ? [] : s.orang.map((o) => o.id);
        } else {
          p.ikut = p.ikut.includes(id) ? p.ikut.filter((x) => x !== id) : [...p.ikut, id];
        }
        simpanData();
        perbaruiChips(li, p);
        renderHasil();
        return;
      }
      if (e.target.closest('[data-aksi="hapus-pesanan"]')) hapusPesanan(p.id);
    });

    // Biaya tambahan
    el.servis.addEventListener('input', () => { s.servis = batas(Inti.bacaDesimal(el.servis.value), 0, 100); simpanData(); renderHasil(); });
    el.pajak.addEventListener('input', () => { s.pajak = batas(Inti.bacaDesimal(el.pajak.value), 0, 100); simpanData(); renderHasil(); });
    el.diskon.addEventListener('input', () => { s.diskon = Inti.bacaRupiah(el.diskon.value); simpanData(); renderHasil(); });
    el.lain.addEventListener('input', () => { s.biayaLain = Inti.bacaRupiah(el.lain.value); simpanData(); renderHasil(); });

    // Bagikan & mulai baru
    $('patungan-bagikan').addEventListener('click', () => {
      const teks = teksBagikan();
      if (!teks) { Inti.toast('Belum ada yang bisa dibagikan. Isi tagihannya dulu.'); return; }
      Inti.bagikanTeks(teks, 'Hasil patungan');
    });
    $('patungan-baru').addEventListener('click', mulaiBaru);

    renderSemua();
  }

  function muatUlang() {
    muatData();
    renderSemua();
  }

  return { mulai, muatUlang, teksBagikan };
})();
