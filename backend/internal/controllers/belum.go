package controllers

import (
	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// Endpoint di file ini sudah terdaftar di routes tapi belum diisi.
// Setiap fungsi menjelaskan apa yang harus dikerjakan. Ikuti pola di stok.go dan buku.go,
// dan cocokkan bentuk JSON dengan fungsi yang sama di frontend/js/api.js.
// Setelah selesai, pindahkan fungsinya ke file yang sesuai (mis. riwayat.go) dan hapus dari sini.

// TODO(Harits): GET /api/buku/terlaris?cabang=&hari=30&batas=5  (RiwayatStok.getBukuTerlaris)
// Jumlahkan |jumlah| riwayat jenis 'kurang' dalam N hari terakhir per buku, urutkan menurun.
// Respons: array bukuJSON + field "terjual".
func (h *Controller) Terlaris(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go Terlaris.")
}

// TODO(Harits): POST /api/buku  (Buku.tambahBuku + stok awal)
// Validasi sama dengan validasiJudul() di frontend/js/api.js. Dalam satu transaksi:
// buat kategori jika belum ada, buat buku, buat 1 baris stok per cabang (cabang tujuan = stokAwal,
// lainnya 0), lalu catat riwayat jenis 'judul_baru'. Staff hanya boleh ke cabangnya sendiri.
// Respons 201: { buku, riwayat }.
func (h *Controller) TambahJudul(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go TambahJudul.")
}

// TODO(Harits): DELETE /api/riwayat/:id  (tombol "Batalkan" di toast)
// Hanya boleh untuk riwayat TERAKHIR pada baris stok itu (selain itu 409 KONFLIK).
// Kembalikan stok ke stok_sebelum, hapus riwayat (notifikasinya ikut terhapus karena CASCADE).
// Untuk jenis 'judul_baru': hapus juga baris stok dan bukunya. Respons: bukuJSON atau null.
func (h *Controller) BatalkanPerubahan(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go BatalkanPerubahan.")
}

// TODO(Harits): GET /api/riwayat?q=&cabang=&dari=YYYY-MM-DD&sampai=&staff=&jenis=&kode=&hal=&per=
// (Laporan.filterLaporan). Manager boleh semua; Staff hanya jika ada parameter kode
// (dipakai layar Ubah stok). Respons: halamanJSON[riwayatJSON] + "ringkas" {tambah, kurang, koreksi, judul_baru}.
func (h *Controller) DaftarRiwayat(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go DaftarRiwayat.")
}

// TODO(Harits): GET /api/laporan/riwayat.csv?<filter sama dengan DaftarRiwayat>  (Laporan.generateLaporan)
// Kirim CSV dengan BOM UTF-8. Teks yang diawali = + - @ diberi awalan ' (cegah formula injection).
// Simpan satu baris ke tabel laporan sebagai catatan siapa mengekspor apa.
func (h *Controller) EksporRiwayat(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go EksporRiwayat.")
}

// TODO(Harits): GET /api/pengguna  (Manager). Respons: [{id, nama, role, idCabang}] untuk filter staff.
func (h *Controller) DaftarPengguna(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go DaftarPengguna.")
}

// TODO(Harits): GET /api/dashboard/staff  (cabang dari akun yang login)
// Respons: {cabang, totalJudul, judulTersedia, eksemplar, menipis: bukuJSON[], terjual30, tren: int[14], terlaris}.
func (h *Controller) DashboardStaff(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go DashboardStaff.")
}

// TODO(Harits): GET /api/dashboard/manager
// Respons: {totalJudul, perCabang: [{cabang, judulTersedia, eksemplar, menipis, kosong, terjual30, tren}],
// aktivitas: riwayatJSON[7], menipis: [{kode, judul, cabang, stok, min, notifikasi}]}.
func (h *Controller) DashboardManager(c *gin.Context) {
	respon.BelumDibuat(c, "TODO: controllers/belum.go DashboardManager.")
}
