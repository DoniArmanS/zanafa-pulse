# Integrasi Backend — Zanafa Pulse

Panduan untuk menyambungkan frontend ini ke backend (API + PostgreSQL).

## Kondisi sekarang

- Frontend berjalan penuh tanpa backend. Data contoh dibuat oleh `js/data/seed.js` dan disimpan di `localStorage` browser (kunci `zanafa-db-v1`), jadi perubahan tetap ada setelah halaman dimuat ulang.
- **Semua akses data lewat satu file: `js/api.js`.** Halaman tidak pernah membaca data langsung. Untuk menyambung ke backend, cukup ganti isi fungsi di `api.js` dengan `fetch("/api/...")`. Halaman lain tidak perlu diubah selama bentuk data yang dikembalikan sama.
- Setiap fungsi `api.js` mengembalikan `Promise` dan melempar `ApiError(kode, pesan, field)` saat gagal. Halaman sudah menangani kode berikut:

| `kode` | Arti | Yang dilakukan halaman |
|---|---|---|
| `SESI` | Belum login atau sesi habis (HTTP 401) | Kembali ke halaman masuk |
| `AKSES` | Role tidak berhak (HTTP 403) | Menampilkan pesan dari server |
| `VALIDASI` | Isian salah (HTTP 422), `field` = nama isian | Pesan tampil di bawah isian itu |
| `TIDAK_ADA` | Data tidak ditemukan (HTTP 404) | Halaman "tidak ditemukan" |
| `KONFLIK` | Perubahan tidak bisa dibatalkan (HTTP 409) | Pesan di toast |
| `KREDENSIAL` | Username/password salah | Pesan di form masuk |
| lainnya | Jaringan/server error | Panel error dengan tombol "Coba lagi" |

Pesan (`pesan`) dari server langsung ditampilkan ke pengguna, jadi tulis dalam bahasa Indonesia yang menjelaskan cara memperbaikinya. Contoh: "Stok Cabang 1 tinggal 2. Jumlah yang dikurangi tidak boleh lebih dari 2."

## Pemetaan fungsi → endpoint (usulan)

| Fungsi `api.js` | Method & endpoint | Kelas/method di class diagram | Akses |
|---|---|---|---|
| `login(username, password)` | `POST /api/auth/login` | `User.login()` | publik |
| `logout()` | `POST /api/auth/logout` | `User.logout()` | login |
| `sesiSaatIni()` | `GET /api/auth/saya` (sekali saat aplikasi dibuka, lalu disimpan) | `User.getRole()` | login |
| `getKategori()` | `GET /api/kategori` | `Kategori.read()` | publik |
| `getBuku({q, kategori, status, cabang, hal, per, urut})` | `GET /api/buku?…` | `Buku.cariBuku()` | publik |
| `getBukuDetail(kode)` | `GET /api/buku/:kode` | `Buku.getInfoBuku()` + `Stok.lihatStokAntarCabang()` | publik |
| `getTerlaris({cabang, hari, batas})` | `GET /api/buku/terlaris?…` | `RiwayatStok.getBukuTerlaris()` | publik |
| `ubahStok({kode, cabang, jenis, jumlah, keterangan})` | `POST /api/stok/:kode/perubahan` | `Stok.updateJumlah()` → `RiwayatStok.catatPerubahan()` → `Stok.cekStokMinimum()` → `Notifikasi.buatNotifikasi()` | login |
| `batalkanPerubahan(idRiwayat)` | `DELETE /api/riwayat/:id` | — (hanya perubahan terakhir pada baris stok itu) | login |
| `tambahJudul(data)` | `POST /api/buku` | `Buku.tambahBuku()` + stok awal | login |
| `getRiwayat({…filter, hal, per})` | `GET /api/riwayat?…` | `Laporan.filterLaporan()` | Manager |
| `getRiwayatBuku(kode, cabang, batas)` | `GET /api/riwayat?kode=…&cabang=…&per=…` | `RiwayatStok.getRiwayat()` | login |
| `eksporRiwayat(filter)` | `GET /api/laporan/riwayat.csv?…` | `Laporan.generateLaporan()` | Manager |
| `getStaff()` | `GET /api/pengguna` | — | Manager |
| `getDashboardStaff()` | `GET /api/dashboard/staff` | `Dashboard.*` (cabang dari akun) | Staff |
| `getDashboardManager()` | `GET /api/dashboard/manager` | `Dashboard.*` (semua cabang) | Manager |

## Aturan yang wajib ditegakkan di backend

Frontend sudah memeriksa hal-hal ini supaya pengguna langsung mendapat umpan balik, tapi **backend tetap harus memeriksanya lagi**, karena frontend bisa diakali.

1. **Role dan cabang berasal dari akun**, bukan dari isian form. Staff hanya boleh mengubah stok dan menambah stok awal di `idCabang` miliknya. Manager boleh semua cabang.
2. **Jenis perubahan**: `tambah` (jumlah ≥ 1), `kurang` (1 ≤ jumlah ≤ stok sekarang), `koreksi` (jumlah = hasil hitung, ≥ 0, berbeda dari stok sekarang). Stok tidak pernah negatif.
3. **Riwayat** menyimpan `jumlah` sebagai selisih (`sesudah − sebelum`), plus `sebelum`, `sesudah`, `idUser`, waktu, dan `keterangan` (maks. 140 karakter). Untuk judul baru, jenisnya `judul_baru` dan `sebelum = 0`.
4. **Menipis** = `stok < stokMinimum`, bukan `<=`. Setiap perubahan yang membuat stok di bawah minimum membuat satu `Notifikasi` dan mengirim email ke Manager. Jika email gagal, simpan `statusKirim = false` untuk dicoba ulang (`Notifikasi.catatKegagalan()`).
5. **Buku terlaris** = jumlah riwayat jenis `kurang` dalam 30 hari terakhir.
6. **Kode buku unik** (tidak peka huruf besar/kecil), 3–20 karakter huruf, angka, atau tanda hubung.
7. **Ekspor CSV**: nilai teks yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'` untuk mencegah formula injection di Excel.

## Bentuk data yang dipakai frontend

```js
// Buku (hasil getBuku / getBukuDetail)
{ kode: "BK-001", judul: "Laut Bercerita", pengarang: "Leila S. Chudori", penerbit: "KPG",
  kategori: "Novel", tahun: 2017, harga: 115000, min: 5,
  sampul: "https://…" | null,
  stok: [7, 1, 9] }            // index 0 = Cabang 1, 1 = Cabang 2, 2 = Cabang 3

// Riwayat
{ id: 312, tanggal: "2026-09-30T04:15:00.000Z", idUser: 1, staff: "Sari Wulandari", cabang: 1,
  kode: "BK-001", judul: "Laut Bercerita", jenis: "kurang", jumlah: -5, sebelum: 7, sesudah: 2,
  keterangan: "Terjual" }

// Daftar berhalaman (getBuku, getRiwayat)
{ items: [...], total: 25, halaman: 1, totalHalaman: 3, per: 10 }

// Hasil ubahStok
{ buku: Buku, riwayat: Riwayat, notifikasi: { id, pesan, tanggal, statusKirim } | null }
```

Bentuk lengkap tiap fungsi bisa dilihat langsung di `js/api.js`. Fungsi-fungsinya pendek dan sudah diberi nama sesuai class diagram.

## Menjalankan frontend secara lokal

Frontend memakai ES modules, jadi harus dibuka lewat server HTTP, bukan dengan klik dua kali file `index.html`:

```bash
python3 -m http.server 8080 --directory frontend
# buka http://localhost:8080
```

Akun contoh: `sari`, `dimas`, `nurul` (Staff Cabang 1–3) dan `rahmat` (Manager), semua dengan password `zanafa123`. Tombol "Pulihkan data contoh" di halaman masuk mengembalikan data ke kondisi awal.

Untuk menguji keadaan error, jalankan di konsol browser `sessionStorage.setItem("zanafa-uji-gagal", "getBuku")`. Panggilan `getBuku` berikutnya akan gagal sekali. Pakai `"*"` supaya panggilan apa pun yang berikutnya gagal.
