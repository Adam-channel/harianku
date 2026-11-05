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

  function tandaTenggat(t) {
    if (!t.tenggat) return '';
    const tanggal = `<span class="tanda">${Inti.ikon('kalender')} ${Inti.esc(Inti.tanggalPendek(t.tenggat))}</span>`;
    if (t.selesai) return tanggal;
    const beda = Inti.selisihHari(t.tenggat);
    if (beda < 0) return `<span class="tanda tanda--merah">Terlambat ${-beda} hari</span>`;
    if (beda === 0) return '<span class="tanda tanda--oranye">Hari ini</span>';
    if (beda === 1) return '<span class="tanda tanda--biru">Besok</span>';
    return tanggal;
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

    renderKemajuan(aktif, selesai);

    // Lencana merah di navigasi: tugas terlambat + jatuh tempo hari ini
    const mendesak = aktif.filter((t) => t.tenggat && Inti.selisihHari(t.tenggat) <= 0).length;
    el.lencana.hidden = !mendesak;
    el.lencana.innerHTML = mendesak ? `${mendesak}<span class="sr"> tugas terlambat atau jatuh tempo hari ini</span>` : '';
  }

  function kosongHtml() {
    let pesan = 'Belum ada tugas. Tulis tugas pertama di kolom <strong>Tugas baru</strong>.';
    let ikon = '📝';
    if (tugas.length && saring === 'aktif') { pesan = 'Semua tugas sudah beres. Mantap!'; ikon = '🎉'; }
    if (tugas.length && saring === 'selesai') { pesan = 'Belum ada tugas yang selesai.'; ikon = '⏳'; }
    return `<li class="kosong"><span class="kosong__ikon" aria-hidden="true">${ikon}</span>${pesan}</li>`;
  }

  function renderKemajuan(aktif, selesai) {
    const total = aktif.length + selesai.length;
    el.kemajuan.hidden = !total;
    if (!total) return;
    const persen = Math.round((selesai.length / total) * 100);
    const telat = aktif.filter((t) => t.tenggat && Inti.selisihHari(t.tenggat) < 0).length;
    const hariIni = aktif.filter((t) => t.tenggat && Inti.selisihHari(t.tenggat) === 0).length;
    const penting = aktif.filter((t) => t.penting).length;
    el.kemajuan.innerHTML = `
      <div class="kemajuan__atas"><strong>${selesai.length} dari ${total} tugas selesai</strong><span>${persen}%</span></div>
      <div class="bar bar--hijau" role="progressbar" aria-label="Tugas selesai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${persen}"><span style="width:${persen}%"></span></div>
      <div class="kemajuan__tanda">${[
        telat ? `<span class="tanda tanda--merah">${telat} terlambat</span>` : '',
        hariIni ? `<span class="tanda tanda--oranye">${hariIni} jatuh tempo hari ini</span>` : '',
        penting ? `<span class="tanda">${penting} penting</span>` : '',
      ].join('')}</div>`;
  }

  function itemHtml(t) {
    const id = Inti.esc(t.id);
    const tenggat = tandaTenggat(t);
    const bintang = t.penting ? `<span class="bintang">${Inti.ikon('bintang')}<span class="sr">Penting: </span></span>` : '';
    return `<li class="${t.selesai ? 'item--selesai' : ''}">
      <label class="centang">
        <input type="checkbox" data-aksi="centang" data-id="${id}" ${t.selesai ? 'checked' : ''}>
        <span class="centang__kotak" aria-hidden="true">${Inti.ikon('centang')}</span>
        <span class="sr">Selesai: ${Inti.esc(t.judul)}</span>
      </label>
      <button type="button" class="item__utama" data-aksi="ubah" data-id="${id}">
        <span class="item__teks">
          <span class="item__judul">${bintang}${Inti.esc(t.judul)}</span>
          ${tenggat ? `<span class="item__sub">${tenggat}</span>` : ''}
        </span>
      </button>
      <button type="button" class="tombol-ikon tombol-ikon--bahaya" data-aksi="hapus" data-id="${id}" aria-label="Hapus tugas ${Inti.esc(t.judul)}">${Inti.ikon('sampah')}</button>
    </li>`;
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
      Inti.toast('Tugas selesai 👍', {
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
      kemajuan: $('tugas-kemajuan'),
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

    render();
  }

  function muatUlang() {
    muatData();
    render();
  }

  return { mulai, render, muatUlang };
})();
