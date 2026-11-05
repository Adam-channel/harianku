# Panduan Harianku

Harianku adalah satu halaman web berisi 4 alat untuk urusan sehari-hari:

| Alat | Gunanya |
|---|---|
| **Uang** | Catat pemasukan & pengeluaran (Rupiah), lihat ringkasan per bulan, pengeluaran per kategori, dan batas anggaran + jatah per hari. |
| **Tugas** | Daftar tugas dengan tenggat dan tanda *penting*. Ada label *Terlambat / Hari ini / Besok* dan lencana merah di menu. |
| **Belanja** | Daftar belanja dengan jumlah & perkiraan harga. Centang saat masuk keranjang, lalu catat totalnya ke Uang atau bagikan daftarnya ke WhatsApp. |
| **Patungan** | Bagi tagihan: *bagi rata* (dengan pembulatan) atau *sesuai pesanan* (servis, pajak, diskon, ongkir). Hasilnya bisa dibagikan ke grup. |

Tidak perlu instalasi, akun, atau internet.

---

## 1. Cara membuka

- **Di laptop:** klik dua kali `index.html`. Halaman terbuka di browser (Chrome, Edge, atau Firefox). Simpan sebagai *bookmark* supaya mudah dibuka lagi.
- **Di HP, sebagai aplikasi:** lihat bagian berikut.
- **Pratinjau dari Claude:** konfigurasi `web-harian` di `.claude/launch.json` (port 8766).

### Versi online

Harianku sudah online di **https://adam-channel.github.io/harianku/** (GitHub Pages, kodenya di repo publik https://github.com/Adam-channel/harianku). Data yang dicatat di alamat ini tersimpan di browser HP/laptop masing-masing, tidak ikut terunggah ke GitHub.

### Pasang di HP (mode aplikasi)

Harianku bisa dipasang di layar utama dan dibuka seperti aplikasi, juga tanpa internet. Fitur ini butuh alamat `https://` seperti versi online di atas. Buka alamatnya di HP:

- **Android (Chrome):** ketuk tombol **Pasang** yang muncul di halaman, atau menu ⋮ lalu **Instal aplikasi / Tambahkan ke layar utama**. Tekan lama ikonnya untuk pintasan langsung ke Uang, Tugas, Belanja, atau Patungan.
- **iPhone (Safari):** tombol **Bagikan** lalu **Tambah ke Layar Utama**.
- **Laptop (Chrome/Edge):** ikon pasang di ujung kanan kolom alamat.

Cukup dibuka sekali saat online, setelah itu aplikasi tetap terbuka walau tidak ada internet. Kalau file di hosting diperbarui, versi baru otomatis terambil saat HP sedang online.

Fitur pasang dan offline ini hanya aktif lewat alamat `https://` (atau `localhost`). Saat dibuka dengan klik dua kali, fitur ini diam saja. Itu normal, karena versi file memang sudah bisa dipakai tanpa internet.

### Memperbarui versi online

Setelah mengubah file di folder `web-harian`, unggah perubahannya ke repo. Situs ikut diperbarui sekitar 1 menit kemudian.

- **Lewat browser:** buka https://github.com/Adam-channel/harianku, masuk ke folder file yang diubah (misalnya `js`), pilih **Add file → Upload files**, seret file barunya, lalu klik **Commit changes**.
- **Lewat terminal** (di folder `web-harian`, yang sudah terhubung ke repo lewat folder tersembunyi `.git`):

  ```
  git add -A
  git commit -m "Perbarui Harianku"
  git push
  ```

HP yang sudah memasang aplikasinya mengambil versi baru otomatis saat sedang online.

Cara pakai singkat:
- Ketuk sebuah baris (transaksi, tugas, barang) untuk **mengubah**.
- Ikon tempat sampah untuk **menghapus**. Setelah menghapus, tekan **Urungkan** di notifikasi bawah selama ±8 detik kalau salah hapus.
- Tampilan gelap/terang otomatis mengikuti pengaturan HP/laptop.

## 2. Data: tersimpan di mana?

Semua data tersimpan di **localStorage browser** di perangkat itu sendiri. Data tidak dikirim ke internet. Akibatnya:

- Data **tetap ada** walau browser ditutup atau laptop dimatikan.
- Data **hilang** kalau "data situs/cache" browser dibersihkan.
- Data di HP, di laptop, dan di browser yang berbeda **terpisah**. Dibuka lewat file (klik dua kali) atau lewat alamat online juga dihitung terpisah.
- Di iPhone, data aplikasi yang dipasang di layar utama terpisah dari data di Safari. Safari juga bisa menghapus data situs yang lama tidak dikunjungi, sedangkan versi yang dipasang jauh lebih aman dari hal itu.

Tombol **Data** (kanan atas) berisi:

| Tombol | Fungsi |
|---|---|
| Unduh cadangan (.json) | Menyimpan semua data ke satu file. Simpan di Google Drive atau flashdisk. |
| Pulihkan dari file cadangan | Mengembalikan data dari file cadangan. Data yang sekarang ada akan diganti. |
| Unduh transaksi untuk Excel (.csv) | Semua transaksi dalam bentuk tabel untuk Excel atau Google Sheets. |
| Hapus … / Hapus semua data | Menghapus data satu alat atau semuanya. Selalu ada konfirmasi dulu. |

**Pindah ke perangkat lain:** *Unduh cadangan* di perangkat lama, lalu *Pulihkan* di perangkat baru.

## 3. Isi folder

```
web-harian/
├── index.html            susunan halaman: teks, tombol, form, dialog
├── PANDUAN.md            file ini
├── manifest.webmanifest  nama, ikon, dan warna saat dipasang sebagai aplikasi
├── sw.js                 service worker: salinan file supaya bisa dibuka offline
├── css/
│   └── style.css         tampilan (warna di bagian 1 "Token desain")
├── ikon/                 ikon.svg (desain induk) + ikon PNG untuk HP
└── js/
    ├── inti.js           fungsi bersama: simpan data, format Rupiah & tanggal, notifikasi, dialog
    ├── uang.js           Catatan Uang (daftar KATEGORI di bagian atas)
    ├── tugas.js          Daftar Tugas
    ├── belanja.js        Daftar Belanja
    ├── patungan.js       Kalkulator Patungan
    ├── data.js           cadangan, pulihkan, CSV, hapus data
    ├── main.js           menyalakan aplikasi & pindah tab
    └── pwa.js            mode aplikasi: manifest, service worker, tombol "Pasang" (dimuat paling akhir)
```

Semua komentar di dalam kode berbahasa Indonesia.

## 4. Mengubah sendiri

Setelah file diubah dan disimpan, muat ulang halaman (**F5**). Kalau perubahan belum terlihat, tekan **Ctrl+F5**.

| Ingin… | Ubah di |
|---|---|
| Ganti warna utama | `css/style.css` bagian 1: `--accent` (oranye) dan `--navy-900` (navy). |
| Tambah/ubah kategori uang | `js/uang.js`, daftar `KATEGORI`. Boleh ubah `nama`/`ikon`, tapi **jangan ganti `id`** yang sudah terpakai. |
| Excel menampilkan CSV dalam satu kolom | `js/data.js`, ganti `PEMISAH_CSV` dari `';'` ke `','`. Titik koma cocok untuk Excel dengan format wilayah Indonesia, termasuk laptop ini. |
| Lama notifikasi "Urungkan" | `js/inti.js`, fungsi `toast` (8000 = 8 detik). |
| Cara hitung pajak patungan | `js/patungan.js`, fungsi `hitungRinci`. Saat ini pajak dihitung dari subtotal + servis, seperti umumnya di resto Indonesia. |
| Teks/judul di halaman | `index.html`. Teks yang muncul dari kode (pesan kosong, notifikasi) ada di file `js/` masing-masing alat. |
| Ganti ikon aplikasi | Folder `ikon/`. Ganti file PNG dengan gambar berukuran sama (192×192, 512×512, dan 180×180 untuk iPhone). Versi *maskable* harus berlatar penuh tanpa sudut transparan, dengan gambar utama di tengah. |
| Menambah file baru (supaya ikut bisa dibuka offline) | `sw.js`: tambahkan nama file ke daftar `BERKAS`, lalu naikkan `VERSI` (misalnya `'harianku-v2'`). |
| Nama aplikasi di layar utama | `manifest.webmanifest` (`name`, `short_name`) dan `apple-mobile-web-app-title` di `index.html`. |

Kunci localStorage yang dipakai (semuanya berawalan `harianku:`): `transaksi`, `anggaran`, `tugas`, `belanja`, `patungan`, `tab` (tab terakhir), `infoDitutup` (pesan sambutan sudah ditutup), `pasangDitutup` (tawaran pasang aplikasi sudah ditutup).

## 5. Kebutuhan

Browser modern: Chrome/Edge/Firefox versi baru, atau Safari 15.4 ke atas (iPhone iOS 15.4+). Tidak memakai library atau font dari internet. Mode aplikasi butuh alamat `https://`.
