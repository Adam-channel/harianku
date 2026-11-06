/* ==============================================================
   HARIANKU · js/tugas.js
   Alat 2: Daftar Tugas

   Data di localStorage:
     "harianku:tugas" -> daftar tugas

   Bentuk satu tugas:
     { id, judul: "Bayar listrik", tenggat: "2026-11-10" atau "",
       penting: true/false, selesai: true/false,
       dibuat: 1730790000000, selesaiPada: 0 }
   ============================================================== */

const Tugas = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let el = {};

  let tugas = [];
  let saring = 'aktif';     // "aktif" | "selesai" | "semua"
  let idDiubah = null;


  /* DATA ---------------------------------------------------------- */
  function muatData() {
    const mentah = Inti.muat('tugas', []);
    tugas = (Array.isArray(mentah) ? mentah : [])
      .filter((t) => t && t.id && String(t.judul || '').trim())
      .map((t) => ({
        id: String(t.id),
        judul: String(t.judul).trim(),
        tenggat: /^\d{4}-\d{2}-\d{2}$/.test(t.tenggat) ? t.tenggat : '',
        penting: !!t.penting,
        selesai: !!t.selesai,
        dibuat: Number(t.dibuat) || 0,
        selesaiPada: Number(t.selesaiPada) || 0,
      }));
  }

  function simpanData() {
    Inti.simpan('tugas', tugas);
  }

  // Urutan: belum selesai dulu -> tenggat terdekat -> yang penting -> yang lebih dulu dibuat.
  // Tugas selesai: yang baru diselesaikan paling atas.
  function urutkan(a, b) {
    if (a.selesai !== b.selesai) return a.selesai ? 1 : -1;
    if (a.selesai) return b.selesaiPada - a.selesaiPada;
    const ta = a.tenggat || '9999-12-31';
    const tb = b.tenggat || '9999-12-31';
    if (ta !== tb) return ta.localeCompare(tb);
    if (a.penting !== b.penting) return a.penting ? -1 : 1;
    return a.dibuat - b.dibuat;
  }

  // Teks tenggat berwarna: merah = terlambat, kuning = hari ini
  function teksTenggat(t) {
    if (!t.tenggat) return '';
    const tanggal = Inti.esc(Inti.tanggalPendek(t.tenggat));
    if (!t.selesai) {
      const beda = Inti.selisihHari(t.tenggat);
      if (beda < 0) return `<span class="tenggat tenggat--telat">Terlambat ${-beda} hari</span>`;
      if (beda === 0) return '<span class="tenggat tenggat--hari-ini">Hari ini</span>';
      if (beda === 1) return '<span class="tenggat tenggat--besok">Besok</span>';
    }
    return `<span class="tenggat">${Inti.ikon('kalender')}${tanggal}</span>`;
  }


  /* TAMPILAN ------------------------------------------------------ */
  function render() {
    const aktif = tugas.filter((t) => !t.selesai);
    const selesai = tugas.filter((t) => t.selesai);

    el.jumlahAktif.textContent = aktif.length;
    el.jumlahSelesai.textContent = selesai.length;
    el.jumlahSemua.textContent = tugas.length;
    el.saring.querySelectorAll('[data-saring]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.saring === saring)));

    const tampil = (saring === 'aktif' ? aktif : saring === 'selesai' ? selesai : tugas).slice().sort(urutkan);
    Inti.jagaFokus(el.daftar, () => {
      el.daftar.innerHTML = tampil.length ? tampil.map(itemHtml).join('') : kosongHtml();
    });
    el.aksi.hidden = !selesai.length;

    // Ringkasan di bawah judul, contoh "2 belum selesai · 1 terlambat"
    const telat = aktif.filter((t) => t.tenggat && Inti.selisihHari(t.tenggat) < 0).length;
    const hariIni = aktif.filter((t) => t.tenggat && Inti.selisihHari(t.tenggat) === 0).length;
    const bagian = [];
    if (tugas.length) bagian.push(aktif.length ? `${aktif.length} belum selesai` : 'Semua tugas selesai');
    if (telat) bagian.push(`${telat} terlambat`);
    if (hariIni) bagian.push(`${hariIni} jatuh tempo hari ini`);
    el.ringkas.textContent = bagian.join(' · ');

    // Angka di menu: tugas terlambat + jatuh tempo hari ini
    const mendesak = telat + hariIni;
    el.lencana.hidden = !mendesak;
    el.lencana.innerHTML = mendesak ? `${mendesak}<span class="sr"> tugas terlambat atau jatuh tempo hari ini</span>` : '';
  }

  function kosongHtml() {
    let judul = 'Belum ada tugas';
    let teks = 'Tulis tugas di kotak di atas, lalu tekan Enter.';
    if (tugas.length && saring === 'aktif') { judul = 'Tidak ada tugas tersisa'; teks = 'Semua tugas sudah selesai.'; }
    if (tugas.length && saring === 'selesai') { judul = 'Belum ada tugas yang selesai'; teks = 'Centang tugas yang sudah dikerjakan.'; }
    return `<li class="kosong"><strong>${judul}</strong>${teks}</li>`;
  }

  function itemHtml(t) {
    const id = Inti.esc(t.id);
    const tenggat = teksTenggat(t);
    return `<li class="baris${t.selesai ? ' is-selesai' : ''}">
      <label class="cek cek--bulat">
        <input type="checkbox" data-aksi="centang" data-id="${id}" ${t.selesai ? 'checked' : ''}>
        <span class="cek__tanda" aria-hidden="true">${Inti.ikon('centang')}</span>
        <span class="sr">Selesai: ${Inti.esc(t.judul)}</span>
      </label>
      <button type="button" class="baris__utama" data-aksi="ubah" data-id="${id}">
        <span class="baris__teks">
          <span class="baris__judul">${Inti.esc(t.judul)}</span>
          ${tenggat ? `<span class="baris__sub">${tenggat}</span>` : ''}
        </span>
        ${t.penting ? `<span class="bintang">${Inti.ikon('bintang')}<span class="sr">Penting</span></span>` : ''}
      </button>
      <button type="button" class="tombol-ikon baris__hapus" data-aksi="hapus" data-id="${id}" aria-label="Hapus tugas ${Inti.esc(t.judul)}">${Inti.ikon('sampah')}</button>
    </li>`;
  }

  // Tombol "Tenggat" di kotak tambah: menampilkan tanggal yang dipilih
  function perbaruiTombolTenggat() {
    const nilai = el.form.elements.tenggat.value;
    el.tenggatNilai.textContent = nilai ? Inti.tanggalPendek(nilai) : 'Tenggat';
    el.tenggatTombol.classList.toggle('alat--aktif', !!nilai);
    el.tenggatTombol.setAttribute('aria-label', nilai ? `Tenggat ${Inti.tanggalPanjang(nilai)}, ubah` : 'Pilih tenggat');
    el.tenggatHapus.hidden = !nilai;
  }


  /* AKSI ---------------------------------------------------------- */
  function tambah(e) {
    e.preventDefault();
    const f = el.form.elements;
    const judul = f.judul.value.trim();
    if (!judul) {
      f.judul.focus();
      Inti.toast('Tulis nama tugasnya dulu.');
      return;
    }
    tugas.push({
      id: Inti.buatId(),
      judul,
      tenggat: f.tenggat.value || '',
      penting: f.penting.checked,
      selesai: false,
      dibuat: Date.now(),
      selesaiPada: 0,
    });
    simpanData();
    el.form.reset();
    perbaruiTombolTenggat();
    if (saring === 'selesai') saring = 'aktif';
    render();
    f.judul.focus();   // siap mengetik tugas berikutnya
    Inti.toast('Tugas ditambahkan');
  }

  function centang(id, selesai) {
    const t = tugas.find((x) => x.id === id);
    if (!t) return;
    t.selesai = selesai;
    t.selesaiPada = selesai ? Date.now() : 0;
    simpanData();
    render();
    if (selesai) {
      Inti.toast('Tugas ditandai selesai', {
        aksi: 'Urungkan',
        onAksi: () => { t.selesai = false; t.selesaiPada = 0; simpanData(); render(); },
      });
    }
  }

  function hapusTugas(id) {
    const posisi = tugas.findIndex((t) => t.id === id);
    if (posisi < 0) return;
    const [lama] = tugas.splice(posisi, 1);
    simpanData();
    render();
    Inti.toast('Tugas dihapus', {
      aksi: 'Urungkan',
      onAksi: () => { tugas.splice(Math.min(posisi, tugas.length), 0, lama); simpanData(); render(); },
    });
  }

  function hapusYangSelesai() {
    const cadangan = tugas.slice();
    const jumlah = tugas.filter((t) => t.selesai).length;
    if (!jumlah) return;
    tugas = tugas.filter((t) => !t.selesai);
    simpanData();
    render();
    Inti.toast(`${jumlah} tugas selesai dihapus`, {
      aksi: 'Urungkan',
      onAksi: () => { tugas = cadangan; simpanData(); render(); },
    });
  }

  // Dialog ubah tugas
  function bukaUbah(t) {
    idDiubah = t.id;
    const f = el.formUbah.elements;
    f.judul.value = t.judul;
    f.tenggat.value = t.tenggat;
    f.penting.checked = t.penting;
    f.selesai.checked = t.selesai;
    el.galatUbah.hidden = true;
    Inti.bukaDialog(el.dlg);
  }

  function simpanUbah(e) {
    e.preventDefault();
    const t = tugas.find((x) => x.id === idDiubah);
    if (!t) { Inti.tutupDialog(el.dlg); return; }
    const f = el.formUbah.elements;
    const judul = f.judul.value.trim();
    if (!judul) {
      el.galatUbah.hidden = false;
      f.judul.focus();
      return;
    }
    t.judul = judul;
    t.tenggat = f.tenggat.value || '';
    t.penting = f.penting.checked;
    if (f.selesai.checked !== t.selesai) {
      t.selesai = f.selesai.checked;
      t.selesaiPada = t.selesai ? Date.now() : 0;
    }
    simpanData();
    Inti.tutupDialog(el.dlg);
    render();
    Inti.toast('Perubahan disimpan');
  }


  /* MULAI --------------------------------------------------------- */
  function mulai() {
    el = {
      form: $('form-tugas'),
      tenggatTombol: $('tugas-tenggat-tombol'),
      tenggatNilai: $('tugas-tenggat-nilai'),
      tenggatHapus: $('tugas-tenggat-hapus'),
      ringkas: $('tugas-ringkas'),
      saring: $('tugas-saring'),
      jumlahAktif: $('tugas-jumlah-aktif'),
      jumlahSelesai: $('tugas-jumlah-selesai'),
      jumlahSemua: $('tugas-jumlah-semua'),
      daftar: $('tugas-daftar'),
      aksi: $('tugas-aksi'),
      lencana: $('lencana-tugas'),
      dlg: $('dlg-tugas'),
      formUbah: $('form-ubah-tugas'),
      galatUbah: $('ubah-tugas-galat'),
    };
    muatData();

    el.form.addEventListener('submit', tambah);
    el.tenggatTombol.addEventListener('click', () => Inti.bukaPemilihTanggal(el.form.elements.tenggat));
    el.form.elements.tenggat.addEventListener('change', perbaruiTombolTenggat);
    el.tenggatHapus.addEventListener('click', () => {
      el.form.elements.tenggat.value = '';
      perbaruiTombolTenggat();
      el.tenggatTombol.focus();
    });

    el.saring.addEventListener('click', (e) => {
      const b = e.target.closest('[data-saring]');
      if (!b) return;
      saring = b.dataset.saring;
      render();
    });

    el.daftar.addEventListener('change', (e) => {
      if (e.target.dataset.aksi === 'centang') centang(e.target.dataset.id, e.target.checked);
    });

    el.daftar.addEventListener('click', (e) => {
      const tombol = e.target.closest('button[data-aksi]');
      if (!tombol) return;
      const t = tugas.find((x) => x.id === tombol.dataset.id);
      if (!t) return;
      if (tombol.dataset.aksi === 'ubah') bukaUbah(t);
      if (tombol.dataset.aksi === 'hapus') hapusTugas(t.id);
    });

    $('tugas-hapus-selesai').addEventListener('click', hapusYangSelesai);

    el.formUbah.addEventListener('submit', simpanUbah);
    el.formUbah.elements.judul.addEventListener('input', () => { el.galatUbah.hidden = true; });
    $('ubah-tugas-hapus').addEventListener('click', () => {
      const id = idDiubah;
      Inti.tutupDialog(el.dlg);
      hapusTugas(id);
    });

    perbaruiTombolTenggat();
    render();
  }

  function muatUlang() {
    muatData();
    render();
  }

  return { mulai, render, muatUlang };
})();
