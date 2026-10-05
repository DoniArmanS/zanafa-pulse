// Package migrations menyimpan file SQL migrasi di dalam binary,
// sehingga server bisa menjalankan migrasi sendiri saat menyala.
//
// Menambah tabel/kolom: buat pasangan file baru dengan nomor berikutnya,
// misalnya 000002_tambah_x.up.sql dan 000002_tambah_x.down.sql.
// Jangan mengubah file migrasi yang sudah pernah dijalankan di server.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
