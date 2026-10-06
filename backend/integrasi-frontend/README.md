# integrasi-frontend/

Satu file: `api.js`. Ini versi `frontend/js/api.js` yang mengambil data dari API backend, bukan dari `localStorage`.

`frontend/BACKEND-INTEGRATION.md` menulis: *"Untuk menyambung ke backend, cukup ganti isi fungsi di `api.js` dengan `fetch("/api/...")`."* Isi penggantinya ditulis di sini supaya folder `frontend/` tidak perlu diubah dulu. Nama fungsi dan bentuk hasilnya sama, jadi halaman-halaman frontend tidak perlu disentuh.

## Cara memasang

**Cara A: lewat Docker, tanpa mengubah `frontend/`.**
Jalankan dengan file tambahan `docker-compose.lokal.yml`:

```bash
docker compose -f docker-compose.yml -f docker-compose.lokal.yml up -d --build
```

File itu menempelkan `api.js` ini di atas `/js/api.js` di dalam container NGINX. File `frontend/js/api.js` di laptop tetap utuh. Kalau browser masih memakai versi lama, muat ulang dengan Ctrl+Shift+R (NGINX mengizinkan file `.js` di-cache 7 hari).

**Cara B: permanen (keputusan tim frontend).**
Salin isi file ini menimpa `frontend/js/api.js` lewat pull request tersendiri. Setelah itu `frontend/js/data/seed.js` tidak lagi dipakai.

Menjalankan backend dengan `go run ./cmd/server` (tanpa NGINX) menyajikan `frontend/` apa adanya, jadi dengan cara itu frontend baru tersambung setelah Cara B.

## Yang berbeda dari prototipe

| Fungsi | Di prototipe | Di file ini |
|---|---|---|
| `sesiSaatIni()` | membaca `localStorage` | bertanya ke `GET /api/auth/saya` sekali saat aplikasi dibuka, lalu diingat di memori |
| `login()` | menyimpan id pengguna di `localStorage` | server memasang cookie `httpOnly`; tidak ada yang disimpan JavaScript |
| `akunContoh()`, `pulihkanDataContoh()` | daftar akun dan isi ulang data di browser | tidak berlaku untuk data di server; blok "Akun contoh untuk mencoba prototipe" di halaman masuk disembunyikan |
| `validasiJudul()` | ikut memeriksa kode kembar di data lokal | memeriksa bentuk isian; kode kembar ditanyakan ke server di latar dan diperiksa ulang saat disimpan |
| `eksporRiwayat()` | menyusun CSV di browser | mengunduh CSV yang disusun server |

Setiap permintaan membawa header `X-Requested-With`, karena backend mewajibkannya untuk permintaan tanpa isi (logout, batalkan).

Uji keadaan error tetap sama: `sessionStorage.setItem("zanafa-uji-gagal", "getBuku")` di konsol browser.
