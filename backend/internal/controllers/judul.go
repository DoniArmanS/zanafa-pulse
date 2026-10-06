package controllers

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

var (
	polaKode   = regexp.MustCompile(`^[A-Za-z0-9-]{3,20}$`)
	polaSampul = regexp.MustCompile(`^data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$`)
)

const (
	stokMaks   = 1_000_000
	sampulMaks = 400_000 // karakter data URL, kira-kira gambar 300 KB
)

type judulBaru struct {
	Kode, Kategori, Judul, Pengarang, Penerbit string
	Harga                                      float64
	Tahun, StokAwal, Min, Cabang               int
	Sampul                                     *string
}

// teksIsian: form frontend mengirim angka sebagai teks ("95000"), Postman biasanya sebagai angka.
func teksIsian(v any) string {
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	}
	return ""
}

func bulatIsian(v any) (int, bool) {
	f, err := strconv.ParseFloat(teksIsian(v), 64)
	if err != nil || f != math.Trunc(f) || math.Abs(f) > 1e9 {
		return 0, false
	}
	return int(f), true
}

// periksaJudul sama dengan validasiJudul() di frontend/js/api.js, diulang di server.
func periksaJudul(in map[string]any) (judulBaru, error) {
	var d judulBaru
	salah := func(field, pesan string) (judulBaru, error) {
		return d, models.ErrValidasi{Field: field, Pesan: pesan}
	}
	wajib := func(field, pesanKosong, nama string, maks int) (string, error) {
		v := teksIsian(in[field])
		if v == "" {
			return "", models.ErrValidasi{Field: field, Pesan: pesanKosong}
		}
		if utf8.RuneCountInString(v) > maks {
			return "", models.ErrValidasi{Field: field, Pesan: fmt.Sprintf("%s maksimal %d karakter.", nama, maks)}
		}
		return v, nil
	}

	kode := teksIsian(in["kode"])
	if kode == "" {
		return salah("kode", "Isi kode buku atau ISBN.")
	}
	if !polaKode.MatchString(kode) {
		return salah("kode", "Kode hanya boleh huruf, angka, dan tanda hubung (3–20 karakter).")
	}
	d.Kode = strings.ToUpper(kode)
	if d.Kode == "TERLARIS" { // sudah dipakai alamat /api/buku/terlaris
		return salah("kode", "Kode TERLARIS tidak bisa dipakai. Pilih kode lain.")
	}

	var err error
	if d.Kategori, err = wajib("kategori", "Pilih kategori.", "Nama kategori", 60); err != nil {
		return d, err
	}
	if d.Judul, err = wajib("judul", "Isi judul buku.", "Judul", 200); err != nil {
		return d, err
	}
	if d.Pengarang, err = wajib("pengarang", "Isi nama pengarang.", "Nama pengarang", 150); err != nil {
		return d, err
	}
	if d.Penerbit, err = wajib("penerbit", "Isi nama penerbit.", "Nama penerbit", 150); err != nil {
		return d, err
	}

	harga, err := strconv.ParseFloat(teksIsian(in["harga"]), 64)
	if err != nil || math.IsNaN(harga) || math.IsInf(harga, 0) || harga <= 0 {
		return salah("harga", "Isi harga lebih dari Rp 0.")
	}
	if harga > 100_000_000 {
		return salah("harga", "Harga maksimal Rp 100.000.000.")
	}
	d.Harga = math.Round(harga*100) / 100

	var ok bool
	kini := time.Now().Year()
	if d.Tahun, ok = bulatIsian(in["tahun"]); !ok || d.Tahun < 1900 || d.Tahun > kini+1 {
		return salah("tahun", fmt.Sprintf("Tahun terbit antara 1900 dan %d.", kini+1))
	}
	if d.StokAwal, ok = bulatIsian(in["stokAwal"]); !ok || d.StokAwal < 0 {
		return salah("stokAwal", "Stok awal tidak boleh negatif.")
	}
	if d.StokAwal > stokMaks {
		return salah("stokAwal", "Stok awal maksimal 1.000.000.")
	}
	if d.Min, ok = bulatIsian(in["min"]); !ok || d.Min < 0 {
		return salah("min", "Batas minimum tidak boleh negatif.")
	}
	if d.Min > stokMaks {
		return salah("min", "Batas minimum maksimal 1.000.000.")
	}
	if d.Cabang, ok = bulatIsian(in["cabang"]); !ok || d.Cabang < 1 {
		return salah("cabang", "Pilih cabang tujuan stok awal.")
	}

	// sampul opsional, hanya gambar kecil berbentuk data URL (hasil form frontend)
	if mentah := in["sampul"]; mentah != nil && mentah != "" {
		sampul, teks := mentah.(string)
		if !teks || len(sampul) > sampulMaks || !polaSampul.MatchString(sampul) {
			return salah("sampul", "Gambar sampul tidak bisa dipakai. Pilih gambar JPG, PNG, atau WebP yang lebih kecil.")
		}
		d.Sampul = &sampul
	}
	return d, nil
}

// kodeGandaPG: PostgreSQL menolak karena melanggar indeks unik kode buku (SQLSTATE 23505).
func kodeGandaPG(err error) bool {
	var pg interface{ SQLState() string }
	return errors.As(err, &pg) && pg.SQLState() == "23505" && strings.Contains(err.Error(), "buku_kode_unik")
}

// TambahJudul = Buku.tambahBuku() + stok awal, dalam satu transaksi.
// POST /api/buku  { kode, kategori, judul, pengarang, penerbit, harga, tahun, stokAwal, min, cabang, sampul }
func (h *Controller) TambahJudul(c *gin.Context) {
	var in map[string]any
	if err := c.ShouldBindJSON(&in); err != nil {
		respon.Validasi(c, "kode", "Data judul baru tidak bisa dibaca. Isi lagi formulirnya.")
		return
	}
	d, err := periksaJudul(in)
	if err != nil {
		respon.Dari(c, err)
		return
	}
	p := middleware.Pengguna(c)
	if !p.BolehUbahCabang(d.Cabang) {
		respon.Akses(c, "Staff hanya bisa menambah stok awal ke cabangnya sendiri.")
		return
	}

	sudahDipakai := models.ErrValidasi{Field: "kode", Pesan: "Kode " + d.Kode + " sudah dipakai buku lain."}
	var riwayat models.RiwayatStok
	err = h.DB.WithContext(c).Transaction(func(tx *gorm.DB) error {
		var cabang []models.Cabang
		if err := tx.Order("id").Find(&cabang).Error; err != nil {
			return err
		}
		adaCabang := false
		for _, cb := range cabang {
			adaCabang = adaCabang || cb.ID == d.Cabang
		}
		if !adaCabang {
			return models.ErrValidasi{Field: "cabang", Pesan: "Pilih cabang tujuan stok awal."}
		}

		// dicek ke semua buku, termasuk yang nonaktif
		var ada int64
		if err := tx.Model(&models.Buku{}).Where("lower(kode) = lower(?)", d.Kode).Count(&ada).Error; err != nil {
			return err
		}
		if ada > 0 {
			return sudahDipakai
		}

		var kat models.Kategori
		err := tx.Where("lower(nama) = lower(?)", d.Kategori).Take(&kat).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			kat = models.Kategori{Nama: d.Kategori}
			err = tx.Create(&kat).Error
		}
		if err != nil {
			return err
		}

		b := models.Buku{
			Kode: d.Kode, Judul: d.Judul, Pengarang: d.Pengarang, Penerbit: d.Penerbit, Tahun: d.Tahun,
			Harga: d.Harga, StokMinimum: d.Min, Sampul: d.Sampul, IDKategori: kat.ID, Status: true,
		}
		if err := tx.Create(&b).Error; err != nil {
			return err
		}

		// satu baris stok untuk setiap cabang: cabang tujuan = stok awal, lainnya 0
		idStokTujuan := 0
		for _, cb := range cabang {
			s := models.Stok{IDBuku: b.ID, IDCabang: cb.ID}
			if cb.ID == d.Cabang {
				s.Jumlah = d.StokAwal
			}
			if err := tx.Omit("TanggalUpdate").Create(&s).Error; err != nil {
				return err
			}
			if cb.ID == d.Cabang {
				idStokTujuan = s.ID
			}
		}

		riwayat = models.RiwayatStok{
			IDStok: idStokTujuan, IDPengguna: p.ID, Jenis: models.JenisJudulBaru, Jumlah: d.StokAwal,
			StokSebelum: 0, StokSesudah: d.StokAwal, Tanggal: time.Now().UTC(), Keterangan: "Stok awal judul baru",
		}
		return tx.Create(&riwayat).Error
	})
	if kodeGandaPG(err) { // dua orang menyimpan kode yang sama pada saat bersamaan
		err = sudahDipakai
	}
	if err != nil {
		respon.Dari(c, err)
		return
	}

	buku, err := h.bukuDariKode(c, d.Kode)
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.Dibuat(c, gin.H{
		"buku": buku,
		"riwayat": riwayatJSON{
			ID: riwayat.ID, Tanggal: riwayat.Tanggal, IDUser: p.ID, Staff: p.Nama, Cabang: d.Cabang,
			Kode: buku.Kode, Judul: buku.Judul, Jenis: riwayat.Jenis, Jumlah: riwayat.Jumlah,
			Sebelum: riwayat.StokSebelum, Sesudah: riwayat.StokSesudah, Keterangan: riwayat.Keterangan,
		},
	})
}
