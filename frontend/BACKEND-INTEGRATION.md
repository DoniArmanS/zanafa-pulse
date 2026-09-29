# Panduan Integrasi Backend — Zanafa Bookstore

Dokumen ini untuk yang akan membuat backend & men-deploy aplikasi ini secara
online. Saat ini seluruh aplikasi adalah **prototipe front-end murni**: semua
data ada di `js/data.js` sebagai array biasa, dan setiap "penyimpanan" hanya
mengubah array itu di memori browser (hilang saat halaman di-refresh). Belum
ada satu pun pemanggilan API (`fetch`/`axios`) di dalam kode.

## 1. Deploy tampilannya (tanpa backend dulu)

Tidak butuh proses build. Folder ini bisa langsung di-upload ke static hosting
apa pun: Netlify, Vercel, GitHub Pages, Cloudflare Pages, atau di-serve lewat
Nginx/Apache biasa. Cukup pastikan struktur folder (`index.html`, `css/`,
`js/`, `assets/`) tetap utuh dan relatif satu sama lain.

## 2. Login saat ini PALSU

Fungsi `doLogin()` di `js/render.js` (baris ±71) menerima **username/password
apa saja** — tidak ada validasi ke server. Untuk versi sungguhan:
- Ganti isi `doLogin()` agar memanggil endpoint login (lihat tabel di bawah)
- Simpan token/session yang dikembalikan backend (misalnya di variabel
  `state.token`, atau `localStorage` jika backend memakai JWT)
- Sertakan token itu di setiap request API berikutnya

## 3. Model data yang dipakai front-end

**Book** (lihat contoh di `js/data.js` baris ±16):
```js
{
  kode: "BK-001",              // string, unik
  judul: "Belajar Data Untuk Pemula",
  pengarang: "Ayu Lestari",
  penerbit: "Penerbit X",
  kategori: "Technology",      // salah satu dari 30 genre di CATEGORIES (js/data.js)
  harga: 85000,                // number, rupiah
  tahun: 2022,
  stok: { C1: 2, C2: 10, C3: 6 },  // jumlah stok per cabang
  min: 5,                      // batas minimum sebelum dianggap "menipis"
  terjual: 12,                 // jumlah terjual (untuk buku terlaris)
  cover: "assets/covers/....jpg"   // opsional, URL gambar sampul
}
```

**HistoryEntry** (contoh di `js/data.js` baris ±47):
```js
{
  tanggal: "15/09/26", waktu: "09:12",
  staff: "Staff A", cabang: "C1",
  kode: "BK-001", judul: "Belajar Data Untuk Pemula",
  jenis: "Tambah" | "Kurang" | "Update (Judul Baru)",
  jumlah: -2,                  // number (bisa negatif), atau string untuk "Update (Judul Baru)"
  sebelum: 4, sesudah: 2        // jumlah stok sebelum/sesudah, atau "-" untuk buku baru
}
```

**Profile** (`js/data.js` baris ±55) — data profil pengguna yang login.

## 4. Endpoint yang disarankan

Nama path di bawah cuma saran — sesuaikan dengan konvensi backend teman kamu.
Yang penting bentuk request/response-nya cocok dengan apa yang dibutuhkan tiap
halaman.

| Method | Endpoint | Dipakai di | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | `doLogin()` — `js/render.js` | `{ username, password, role }` | `{ token, username, role, cabang }` |
| GET | `/api/books` | Katalog, Cek Stok, Kelola Stok | query: `q`, `kategori`, `page` | daftar `Book[]` + total halaman |
| GET | `/api/books/:kode` | Cek Stok, Kelola Stok Edit | — | satu `Book` |
| POST | `/api/books` | `saveNewBook()` — `js/render.js` (±586) | field form "Tambah Judul Baru" | `Book` yang baru dibuat |
| PATCH | `/api/books/:kode/stock` | `saveStockChange()` — `js/render.js` (±462) | `{ cabang, jenis: "tambah"\|"kurang", jumlah, keterangan }` | `Book` terbaru + `HistoryEntry` baru |
| GET | `/api/history` | Riwayat Stok | query: `cabang`, `staff`, `jenis` | `HistoryEntry[]` |
| GET | `/api/dashboard/summary?cabang=C1` | Dashboard Staff | — | total judul, stok tersedia, stok menipis, buku terlaris |
| GET | `/api/dashboard/summary-all` | Dashboard Manager | — | ringkasan per cabang + aktivitas terbaru + notifikasi stok menipis |
| GET | `/api/profile` | Halaman Profil | — | `Profile` milik user yang login |

## 5. Di bagian kode mana harus disambungkan

Semua logika yang perlu diganti dari "mengubah array lokal" menjadi
"memanggil API" ada di dua file ini:
- **`js/render.js`** — fungsi `doLogin()`, `saveStockChange()`, `saveNewBook()`,
  dan bagian atas tiap fungsi `render...()` yang saat ini membaca langsung
  dari `books`/`history` (bisa diganti jadi hasil `await fetch(...)`)
- **`js/events.js`** — tempat semua tombol terhubung ke fungsi di atas; struktur
  event listener-nya tidak perlu diubah, hanya isi fungsi yang dipanggilnya

## 6. Aset gambar

`assets/logo.png`, `assets/profile-photo.jpg`, dan `assets/covers/*.jpg`
saat ini adalah file statis yang ikut ter-deploy bersama front-end. kalau nanti backend punya sistem upload gambar sendiri
(S3, Cloudinary, dll.), tinggal ganti nilai `cover`/`photo` pada data yang
dikembalikan API dengan URL dari sana.
