# Cara berkontribusi

Branch `main` dikunci: tidak ada yang bisa push langsung ke sana. Semua perubahan masuk lewat **pull request (PR)** dan harus disetujui Doni (Project Manager) dulu.

## Folder dan isinya

| Folder | Isi | Penanggung jawab utama |
|---|---|---|
| `frontend/` | Tampilan aplikasi (sudah jadi) | Sarwenda, Zahra |
| `backend/` | API, logika, database | Harits |
| `desain/` | Wireframe, mockup, aset gambar | Yesi, Kayla, Sarwenda, Zahra |
| `laporan/` | Proposal, analisis, laporan akhir, presentasi | Semua |
| `pengujian/` | Skenario uji, hasil uji, bug, UAT | Yesi, Kayla, semua |

Detail tiap folder ada di file `README.md` di dalamnya.

## Cara A: lewat website GitHub (tanpa install apa pun)

Cocok untuk mengunggah wireframe, laporan, atau hasil pengujian.

1. Buka https://github.com/DoniArmanS/zanafa-pulse, masuk ke folder tujuan (misalnya `desain/wireframe`).
2. Klik **Add file → Upload files**, lalu seret file-nya. **Jangan unggah dalam bentuk `.zip`.**
3. Di bagian bawah, tulis pesan singkat, misalnya `Tambah wireframe Riwayat stok v2`.
4. Pilih **Create a new branch for this commit and start a pull request**, lalu **Propose changes**.
5. Isi template PR, klik **Create pull request**.
6. Tunggu Doni memeriksa. Kalau ada permintaan revisi, unggah ulang file ke **branch yang sama**.

## Cara B: lewat git (untuk yang memegang kode)

```bash
git checkout main && git pull
git checkout -b fitur/nama-singkat        # contoh: backend/endpoint-login
# ... kerjakan ...
git add <file yang diubah>
git commit -m "Tambah endpoint login"
git push -u origin fitur/nama-singkat
```

Lalu buka GitHub, klik **Compare & pull request**.

Nama branch: `backend/...`, `frontend/...`, `desain/...`, `laporan/...`, `pengujian/...`.

Progres kerja tercatat otomatis dari pesan commit dan PR, jadi tulis pesan yang jelas, misalnya `Tambah skenario uji Kelola stok`, bukan `update`.

## Aturan

- Satu PR untuk satu hal. Lebih mudah diperiksa dan disetujui.
- Jangan pernah commit file `.env`, password, atau token.
- PR yang sudah disetujui digabung (merge) oleh Doni.
