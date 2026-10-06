package controllers

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// Tanggal di filter dan di CSV dihitung menurut jam toko (WIB), bukan UTC.
const zonaToko = "Asia/Jakarta"

const kolomRiwayat = "r.id, r.tanggal, r.id_pengguna AS id_user, u.nama AS staff, s.id_cabang AS cabang, " +
	"b.kode, b.judul, r.jenis, r.jumlah, r.stok_sebelum AS sebelum, r.stok_sesudah AS sesudah, r.keterangan"

type saringRiwayat struct {
	cabang, staff int
	dari, sampai  string // YYYY-MM-DD
	jenis, q      string
	kode          string
}

type halamanRiwayatJSON struct {
	Items        []riwayatJSON    `json:"items"`
	Total        int64            `json:"total"`
	Halaman      int              `json:"halaman"`
	TotalHalaman int              `json:"totalHalaman"`
	Per          int              `json:"per"`
	Ringkas      map[string]int64 `json:"ringkas"`
}

func tanggalValid(s string) bool {
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

// bacaSaringRiwayat membaca filter dari query string. ok = false berarti respons galat sudah dikirim.
func bacaSaringRiwayat(c *gin.Context) (s saringRiwayat, ok bool) {
	s.cabang = angkaQuery(c, "cabang", 0, 0, 1000)
	s.staff = angkaQuery(c, "staff", 0, 0, 1<<30)
	s.q = strings.TrimSpace(c.Query("q"))
	s.kode = strings.TrimSpace(c.Query("kode"))
	s.dari = strings.TrimSpace(c.Query("dari"))
	s.sampai = strings.TrimSpace(c.Query("sampai"))
	s.jenis = strings.TrimSpace(c.Query("jenis"))

	if s.dari != "" && !tanggalValid(s.dari) {
		respon.Validasi(c, "dari", "Tanggal “dari” tidak valid. Pilih tanggal dari kalender.")
		return s, false
	}
	if s.sampai != "" && !tanggalValid(s.sampai) {
		respon.Validasi(c, "sampai", "Tanggal “sampai” tidak valid. Pilih tanggal dari kalender.")
		return s, false
	}
	if s.dari != "" && s.sampai != "" && s.dari > s.sampai {
		respon.Validasi(c, "dari", "Tanggal “dari” tidak boleh setelah tanggal “sampai”. Ubah salah satunya.")
		return s, false
	}
	switch s.jenis {
	case "", models.JenisTambah, models.JenisKurang, models.JenisKoreksi, models.JenisJudulBaru:
	default:
		respon.Validasi(c, "jenis", "Jenis perubahan tidak dikenal.")
		return s, false
	}
	return s, true
}

// kueriRiwayat menyusun query baru setiap dipanggil (jangan pakai ulang hasilnya untuk dua query).
func (h *Controller) kueriRiwayat(ctx context.Context, s saringRiwayat) *gorm.DB {
	q := h.DB.WithContext(ctx).Table("riwayat_stok r").
		Joins("JOIN stok s ON s.id = r.id_stok").
		Joins("JOIN buku b ON b.id = s.id_buku").
		Joins("JOIN pengguna u ON u.id = r.id_pengguna")
	if s.cabang > 0 {
		q = q.Where("s.id_cabang = ?", s.cabang)
	}
	if s.staff > 0 {
		q = q.Where("r.id_pengguna = ?", s.staff)
	}
	if s.jenis != "" {
		q = q.Where("r.jenis = ?", s.jenis)
	}
	if s.kode != "" {
		q = q.Where("lower(b.kode) = lower(?)", s.kode)
	}
	// "sampai 5 Okt" = sebelum 6 Okt pukul 00.00 waktu toko
	if s.dari != "" {
		q = q.Where("r.tanggal >= ((?::text)::date)::timestamp AT TIME ZONE '"+zonaToko+"'", s.dari)
	}
	if s.sampai != "" {
		q = q.Where("r.tanggal < ((?::text)::date + 1)::timestamp AT TIME ZONE '"+zonaToko+"'", s.sampai)
	}
	if s.q != "" {
		pola := "%" + escapeLike(s.q) + "%"
		q = q.Where("(b.kode ILIKE ? OR b.judul ILIKE ? OR r.keterangan ILIKE ?)", pola, pola, pola)
	}
	return q
}

// DaftarRiwayat = Laporan.filterLaporan(). Manager boleh semua;
// Staff hanya riwayat satu buku (?kode=), dipakai layar Ubah stok.
// GET /api/riwayat?q=&cabang=&dari=YYYY-MM-DD&sampai=&staff=&jenis=&kode=&hal=&per=
func (h *Controller) DaftarRiwayat(c *gin.Context) {
	s, ok := bacaSaringRiwayat(c)
	if !ok {
		return
	}
	if s.kode == "" && !middleware.Pengguna(c).Manager() {
		respon.Akses(c, "Halaman ini hanya untuk Manager.")
		return
	}
	hal := angkaQuery(c, "hal", 1, 1, 100000)
	per := angkaQuery(c, "per", 15, 1, 100)

	var perJenis []struct {
		Jenis  string
		Jumlah int64
	}
	if err := h.kueriRiwayat(c, s).Select("r.jenis, COUNT(*) AS jumlah").Group("r.jenis").Scan(&perJenis).Error; err != nil {
		respon.Server(c, err)
		return
	}
	ringkas := map[string]int64{models.JenisTambah: 0, models.JenisKurang: 0, models.JenisKoreksi: 0, models.JenisJudulBaru: 0}
	var total int64
	for _, x := range perJenis {
		ringkas[x.Jenis] = x.Jumlah
		total += x.Jumlah
	}
	totalHalaman := int((total + int64(per) - 1) / int64(per))
	if totalHalaman < 1 {
		totalHalaman = 1
	}
	if hal > totalHalaman {
		hal = totalHalaman
	}

	items := []riwayatJSON{}
	err := h.kueriRiwayat(c, s).Select(kolomRiwayat).Order("r.tanggal DESC, r.id DESC").
		Offset((hal - 1) * per).Limit(per).Scan(&items).Error
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, halamanRiwayatJSON{Items: items, Total: total, Halaman: hal, TotalHalaman: totalHalaman, Per: per, Ringkas: ringkas})
}

var labelJenis = map[string]string{
	models.JenisTambah: "Tambah", models.JenisKurang: "Kurang", models.JenisKoreksi: "Koreksi jumlah", models.JenisJudulBaru: "Judul baru",
}

// amanCSV: teks berawalan = + - @ diberi ' supaya tidak dijalankan Excel sebagai rumus.
func amanCSV(s string) string {
	if s != "" && strings.ContainsRune("=+-@", rune(s[0])) {
		s = "'" + s
	}
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}

// EksporRiwayat = Laporan.generateLaporan(). Khusus Manager.
// GET /api/laporan/riwayat.csv?<filter sama dengan DaftarRiwayat>
func (h *Controller) EksporRiwayat(c *gin.Context) {
	s, ok := bacaSaringRiwayat(c)
	if !ok {
		return
	}
	var baris []struct {
		Tgl, Jam, Staff    string
		Cabang             int
		Kode, Judul, Jenis string
		Jumlah             int
		Sebelum, Sesudah   int
		Keterangan         string
	}
	err := h.kueriRiwayat(c, s).
		Select("to_char(r.tanggal AT TIME ZONE '" + zonaToko + "', 'YYYY-MM-DD') AS tgl, " +
			"to_char(r.tanggal AT TIME ZONE '" + zonaToko + "', 'HH24:MI') AS jam, " +
			"u.nama AS staff, s.id_cabang AS cabang, b.kode, b.judul, r.jenis, r.jumlah, " +
			"r.stok_sebelum AS sebelum, r.stok_sesudah AS sesudah, r.keterangan").
		Order("r.tanggal DESC, r.id DESC").Limit(50000).Scan(&baris).Error
	if err != nil {
		respon.Server(c, err)
		return
	}

	// catat siapa mengekspor apa
	lap := models.Laporan{IDPengguna: middleware.Pengguna(c).ID, JenisLaporan: "riwayat_stok", TanggalDibuat: time.Now().UTC()}
	if t, err := time.Parse("2006-01-02", s.dari); err == nil {
		lap.PeriodeAwal = &t
	}
	if t, err := time.Parse("2006-01-02", s.sampai); err == nil {
		lap.PeriodeAkhir = &t
	}
	if err := h.DB.WithContext(c).Create(&lap).Error; err != nil {
		respon.Server(c, err)
		return
	}

	var b strings.Builder
	b.WriteString("\uFEFF") // BOM supaya Excel membaca UTF-8
	b.WriteString("tanggal,waktu,staff,cabang,kode,judul,jenis,jumlah,stok_sebelum,stok_sesudah,keterangan")
	for _, r := range baris {
		fmt.Fprintf(&b, "\r\n%s,%s,%s,%d,%s,%s,%s,%d,%d,%d,%s", r.Tgl, r.Jam, amanCSV(r.Staff), r.Cabang, amanCSV(r.Kode),
			amanCSV(r.Judul), amanCSV(labelJenis[r.Jenis]), r.Jumlah, r.Sebelum, r.Sesudah, amanCSV(r.Keterangan))
	}

	cabang, dari, sampai := "semua-cabang", "awal", "sekarang"
	if s.cabang > 0 {
		cabang = "cabang-" + strconv.Itoa(s.cabang)
	}
	if s.dari != "" {
		dari = s.dari
	}
	if s.sampai != "" {
		sampai = s.sampai
	}
	nama := url.PathEscape(fmt.Sprintf("riwayat-stok_%s_%s_%s.csv", cabang, dari, sampai))
	c.Header("Content-Disposition", `attachment; filename="`+nama+`"`)
	c.Header("X-Jumlah-Baris", strconv.Itoa(len(baris)))
	c.Data(200, "text/csv; charset=utf-8", []byte(b.String()))
}
