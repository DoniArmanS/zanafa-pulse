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
    controllers/            ← Controller
    middleware/             ← cek login (sesi cookie), cek role Manager, keamanan
    routes/routes.go        ← daftar URL -> controller
    respon/                 ← format JSON sukses/galat yang dipahami frontend
    seed/                   ← data contoh
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
| `GET /api/buku/terlaris` | ⬜ TODO | `controllers/belum.go` |
| `POST /api/buku` (judul baru) | ⬜ TODO | `controllers/belum.go` |
| `DELETE /api/riwayat/:id` (Batalkan) | ⬜ TODO | `controllers/belum.go` |
| `GET /api/riwayat`, `GET /api/laporan/riwayat.csv` | ⬜ TODO | `controllers/belum.go` |
| `GET /api/pengguna`, `GET /api/dashboard/staff`, `GET /api/dashboard/manager` | ⬜ TODO | `controllers/belum.go` |
| Kirim email notifikasi stok menipis | ⬜ TODO | komentar di `controllers/stok.go` |
| Riwayat contoh di seed (agar dashboard berisi) | ⬜ TODO | `seed/seed.go` |
| Batas percobaan login | ⬜ TODO | komentar di `controllers/auth.go` |

Endpoint TODO sudah terdaftar dan menjawab `501 BELUM_DIBUAT`. Komentar di atas setiap fungsi menjelaskan apa yang harus dikerjakan.

## Aturan penting

- **Role dan cabang selalu dari akun yang login** (`middleware.Pengguna(c)`), jangan dari isian JSON.
- **Perubahan stok wajib dalam transaksi** dan baris stok dikunci (`FOR UPDATE`), lihat `UbahStok`. Teruji: 5 pengurangan bersamaan tidak saling menimpa.
- **Menipis = `stok < stok_minimum`** (fungsi `models.Menipis`).
- **Galat** pakai `respon.*` supaya frontend menerima `{kode, pesan, field}` dengan pesan berbahasa Indonesia yang menjelaskan cara memperbaikinya.
- **Permintaan yang mengubah data** wajib `Content-Type: application/json` (pencegah CSRF). Permintaan tanpa isi (logout, hapus) wajib header `X-Requested-With`.
- **Tabel baru atau kolom baru** = file migrasi baru (`000002_...up.sql` + `.down.sql`). Jangan mengubah migrasi yang sudah pernah dijalankan.
- **Jangan commit `.env`** atau password apa pun.
