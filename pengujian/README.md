# pengujian/

Rencana dan hasil pengujian sistem.

**Penanggung jawab:** System Analyst menyusun skenario; semua anggota ikut menguji.

## Yang dimasukkan ke sini

| Subfolder / file | Isi |
|---|---|
| `skenario-uji.md` | Daftar kasus uji per use case: langkah, data, hasil yang diharapkan (black-box) |
| `hasil/YYYY-MM-DD.md` | Hasil uji: lulus/gagal, siapa yang menguji, di browser/HP apa |
| `bug/` | Laporan bug dengan screenshot. Lebih baik lagi: buat **Issue** di GitHub dan tempel link-nya di sini |
| `uat/` | User Acceptance Test bersama Store Manager / Staff toko (form + tanda tangan, PDF) |

## Contoh baris skenario uji

| ID | Use case | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| UJ-06-02 | Mengelola stok | Login `sari`, Kelola stok, pilih BK-001, Kurang 9 | Muncul pesan "Stok Cabang 1 tinggal 7…", tombol simpan nonaktif |

## Kenapa perlu folder ini

Pengujian adalah bagian penilaian (Minggu 13). Anggota yang tidak memegang kode tetap bisa berkontribusi besar di sini: menguji aplikasi dan menuliskan hasilnya.
