# backend/

Kode server: API, logika bisnis (Model & Controller), dan database PostgreSQL.

**Penanggung jawab:** Harits Dwi Rahmayudi (Backend Developer)

## Yang dimasukkan ke sini

- Kode aplikasi backend (framework MVC yang dipilih tim)
- Skema dan migrasi database (`database/migrations/`), plus data awal (`database/seed/`)
- Pengujian otomatis backend (`tests/`)
- `Dockerfile` untuk backend
- `.env.example` berisi **nama** variabel lingkungan tanpa nilai rahasia

## Acuan wajib

- Daftar fungsi yang harus disediakan API ada di [`../frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md). Setiap fungsi di `frontend/js/api.js` = satu endpoint.
- Struktur tabel mengikuti class diagram (Buku, Stok, Cabang, Kategori, User, RiwayatStok, Notifikasi, Laporan) ditambah kolom `kode`, `penerbit`, `tahun`, `sampul` di tabel Buku.

## Jangan dimasukkan

- File `.env` asli, password database, API key email. Simpan di laptop masing-masing / GitHub Secrets.
- Folder hasil install dependensi (`vendor/`, `node_modules/`, `venv/`). Sudah di-ignore.
