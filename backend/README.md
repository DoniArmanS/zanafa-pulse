# backend/

API server Zanafa Pulse: **Go + Gin + GORM + PostgreSQL**, dengan pola MVC.

**Penanggung jawab:** Harits Dwi Rahmayudi (Backend Developer)

| MVC | Lokasi |
|---|---|
| **Model** | `internal/models/` (struct tabel + aturan bisnis seperti `HitungStokBaru`) |
| **View** | folder `../frontend/` (HTML/CSS/JS yang memanggil API ini) |
| **Controller** | `internal/controllers/` (satu fungsi = satu endpoint) |

## Struktur

```
backend/
  cmd/server/main.go        ← menyalakan server
  cmd/seed/main.go          ← mengisi data contoh (25 buku, 3 cabang, 4 akun)
  migrations/*.sql          ← struktur tabel (dijalankan otomatis saat server menyala)
  internal/
    config/                 ← baca pengaturan dari .env
    database/               ← koneksi PostgreSQL + menjalankan migrasi
    models/                 ← Model
    controllers/            ← Controller (+ pengujian API: *_test.go)
    middleware/             ← cek login (sesi cookie), cek role Manager, keamanan, batas percobaan login
    routes/routes.go        ← daftar URL -> controller
    respon/                 ← format JSON sukses/galat yang dipahami frontend
    email/                  ← kirim email lewat SMTP
    notifikasi/             ← email stok menipis + kirim ulang yang gagal
    seed/                   ← data contoh (buku, akun, riwayat 40 hari)
  integrasi-frontend/api.js ← versi frontend/js/api.js yang memanggil API ini
  Dockerfile
```

## Menjalankan

**Cara 1, semua lewat Docker** (dari folder root repo):

```bash
cp .env.example .env              # ganti POSTGRES_PASSWORD
docker compose up -d --build
docker compose run --rm backend /app/seed   # sekali saja
# buka http://localhost:8080
```

Butuh plugin Docker Compose. Di Ubuntu: `sudo apt install docker-compose-v2`.

**Cara 2, Go langsung** (untuk mengembangkan backend):

```bash
# 1. PostgreSQL lewat Docker
docker run -d --name zanafa-db -e POSTGRES_DB=zanafa -e POSTGRES_USER=zanafa \
  -e POSTGRES_PASSWORD=ganti-password-ini -p 127.0.0.1:5432:5432 postgres:17-alpine

# 2. Backend (butuh Go 1.26+)
cd backend
cp .env.example .env
go run ./cmd/seed       # isi data contoh
go run ./cmd/server     # http://localhost:8081, frontend ikut disajikan (FRONTEND_DIR)
```

Akun contoh (password `zanafa123`): `sari`, `dimas`, `nurul` (Staff Cabang 1–3), `rahmat` (Manager).

**Sebelum membuat PR**, jalankan: `gofmt -w . && go vet ./... && go test ./...`. CI GitHub Actions menjalankan pemeriksaan yang sama.

## Status endpoint

Daftar lengkap dan bentuk JSON: [`../frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md).

| Endpoint | Status | Lokasi |
|---|---|---|
| `GET /api/health` | ✅ Selesai | `controllers/health.go` |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/saya` | ✅ Selesai | `controllers/auth.go` |
| `GET /api/kategori` | ✅ Selesai | `controllers/buku.go` |
| `GET /api/buku` (cari, filter, paginasi), `GET /api/buku/:kode` | ✅ Selesai | `controllers/buku.go` |
| `POST /api/stok/:kode/perubahan` (tambah/kurang/koreksi + riwayat + notifikasi) | ✅ Selesai, **contoh pola** | `controllers/stok.go` |
| `GET /api/buku/terlaris` | ✅ Selesai | `controllers/terlaris.go` |
| `POST /api/buku` (judul baru) | ✅ Selesai | `controllers/judul.go` |
| `DELETE /api/riwayat/:id` (Batalkan) | ✅ Selesai | `controllers/batalkan.go` |
| `GET /api/riwayat`, `GET /api/laporan/riwayat.csv` | ✅ Selesai | `controllers/riwayat.go` |
| `GET /api/pengguna` | ✅ Selesai | `controllers/pengguna.go` |
| `GET /api/dashboard/staff`, `GET /api/dashboard/manager` | ✅ Selesai | `controllers/dashboard.go` |
| Kirim email notifikasi stok menipis + kirim ulang yang gagal | ✅ Selesai | `notifikasi/`, `email/` |
| Riwayat contoh di seed (agar dashboard berisi) | ✅ Selesai | `seed/riwayat.go` |
| Batas percobaan login (5 kali gagal per 15 menit) | ✅ Selesai | `middleware/batas_login.go` |

## Email stok menipis

Setiap perubahan yang membuat stok di bawah minimum membuat satu notifikasi, lalu emailnya dikirim di latar ke alamat di `EMAIL_OWNER`. Kalau gagal, perubahan stok tetap tersimpan, `status_kirim` tetap `false`, dan pengiriman dicoba ulang tiap `NOTIFIKASI_ULANG_MENIT` (paling banyak 5 kali). Tanpa `SMTP_HOST`, email tidak dikirim sama sekali. Variabelnya ada di `.env.example`.

Untuk mencoba di laptop, pakai Mailpit lewat `docker-compose.lokal.yml` (lihat komentar di file itu), lalu buka http://localhost:8025.

## Menyambungkan frontend

`frontend/js/api.js` masih memakai data contoh di browser. Versi yang memanggil API ini ada di `integrasi-frontend/api.js`; cara memasangnya dijelaskan di `integrasi-frontend/README.md`.

## Pengujian API

`internal/controllers/*_test.go` menguji semua endpoint lewat HTTP sungguhan (65 kasus). Butuh database PostgreSQL kosong khusus pengujian, karena isinya dihapus setiap kelompok test:

```bash
docker run -d --name zanafa-uji -e POSTGRES_DB=zanafa_uji -e POSTGRES_USER=zanafa \
  -e POSTGRES_PASSWORD=uji -p 127.0.0.1:5433:5432 postgres:17-alpine

DATABASE_URL_UJI='postgres://zanafa:uji@localhost:5433/zanafa_uji?sslmode=disable' go test ./... -count=1
```

Tanpa `DATABASE_URL_UJI`, test API dilewati dan `go test ./...` tetap lulus (begitu juga di GitHub Actions).

## Aturan penting

- **Role dan cabang selalu dari akun yang login** (`middleware.Pengguna(c)`), jangan dari isian JSON.
- **Perubahan stok wajib dalam transaksi** dan baris stok dikunci (`FOR UPDATE`), lihat `UbahStok`. Teruji: 5 pengurangan bersamaan tidak saling menimpa.
- **Menipis = `stok < stok_minimum`** (fungsi `models.Menipis`).
- **Batalkan** hanya untuk perubahan terakhir pada baris stok itu, oleh pelakunya atau Manager, paling lama 10 menit setelah disimpan.
- **Galat** pakai `respon.*` supaya frontend menerima `{kode, pesan, field}` dengan pesan berbahasa Indonesia yang menjelaskan cara memperbaikinya.
- **Permintaan yang mengubah data** wajib `Content-Type: application/json` (pencegah CSRF). Permintaan tanpa isi (logout, hapus) wajib header `X-Requested-With`.
- **Tabel baru atau kolom baru** = file migrasi baru (`000002_...up.sql` + `.down.sql`). Jangan mengubah migrasi yang sudah pernah dijalankan.
- **Jangan commit `.env`** atau password apa pun.
