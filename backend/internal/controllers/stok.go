package controllers

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

type riwayatJSON struct {
	ID         int64     `json:"id"`
	Tanggal    time.Time `json:"tanggal"`
	IDUser     int       `json:"idUser"`
	Staff      string    `json:"staff"`
	Cabang     int       `json:"cabang"`
	Kode       string    `json:"kode"`
	Judul      string    `json:"judul"`
	Jenis      string    `json:"jenis"`
	Jumlah     int       `json:"jumlah"`
	Sebelum    int       `json:"sebelum"`
	Sesudah    int       `json:"sesudah"`
	Keterangan string    `json:"keterangan"`
}

type notifikasiJSON struct {
	ID          int       `json:"id"`
	Pesan       string    `json:"pesan"`
	Tanggal     time.Time `json:"tanggal"`
	StatusKirim bool      `json:"statusKirim"`
}

var errBukuTidakAda = errors.New("buku tidak ada")

// UbahStok = Stok.updateJumlah() -> RiwayatStok.catatPerubahan() -> Stok.cekStokMinimum()
// -> Notifikasi.buatNotifikasi(), semuanya dalam satu transaksi database.
// Endpoint ini contoh lengkap pola yang dipakai endpoint lain.
//
// POST /api/stok/:kode/perubahan  { "cabang": 1, "jenis": "tambah|kurang|koreksi", "jumlah": 3, "keterangan": "" }
func (h *Controller) UbahStok(c *gin.Context) {
	var in struct {
		Cabang     int    `json:"cabang"`
		Jenis      string `json:"jenis"`
		Jumlah     *int   `json:"jumlah"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		respon.Validasi(c, "jumlah", "Isi jumlah dengan angka bulat.")
		return
	}
	if in.Jumlah == nil {
		respon.Validasi(c, "jumlah", "Isi jumlah dengan angka bulat.")
		return
	}
	keterangan := strings.TrimSpace(in.Keterangan)
	if len([]rune(keterangan)) > 140 {
		respon.Validasi(c, "keterangan", "Keterangan maksimal 140 karakter.")
		return
	}

	// 1. Otorisasi: Staff hanya cabangnya sendiri (diputuskan dari akun, bukan isian form).
	p := middleware.Pengguna(c)
	if !p.BolehUbahCabang(in.Cabang) {
		respon.Akses(c, "Staff hanya bisa mengubah stok cabangnya sendiri.")
		return
	}

	var (
		riwayat models.RiwayatStok
		notif   *models.Notifikasi
		judul   string
		kode    string
	)
	err := h.DB.WithContext(c).Transaction(func(tx *gorm.DB) error {
		var b models.Buku
		if err := tx.Where("lower(kode) = lower(?) AND status", c.Param("kode")).Take(&b).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errBukuTidakAda
			}
			return err
		}
		judul, kode = b.Judul, b.Kode

		// 2. Kunci baris stok (SELECT ... FOR UPDATE) supaya dua kasir tidak saling menimpa.
		var s models.Stok
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id_buku = ? AND id_cabang = ?", b.ID, in.Cabang).Take(&s).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return models.ErrValidasi{Field: "cabang", Pesan: fmt.Sprintf("Cabang %d tidak ditemukan.", in.Cabang)}
			}
			return err
		}

		// 3. Hitung stok baru (validasi ada di models.HitungStokBaru).
		// Simpan nilai lama dulu: GORM mengisi ulang s.Jumlah dengan nilai baru setelah Updates.
		sebelum := s.Jumlah
		sesudah, err := models.HitungStokBaru(in.Jenis, sebelum, *in.Jumlah, in.Cabang)
		if err != nil {
			return err
		}
		sekarang := time.Now().UTC()
		if err := tx.Model(&s).Updates(map[string]any{"jumlah": sesudah, "tanggal_update": sekarang}).Error; err != nil {
			return err
		}

		// 4. Catat riwayat (audit trail).
		riwayat = models.RiwayatStok{
			IDStok: s.ID, IDPengguna: p.ID, Jenis: in.Jenis, Jumlah: sesudah - sebelum,
			StokSebelum: sebelum, StokSesudah: sesudah, Tanggal: sekarang, Keterangan: keterangan,
		}
		if err := tx.Create(&riwayat).Error; err != nil {
			return err
		}

		// 5. Cek stok minimum -> buat notifikasi.
		if models.Menipis(sesudah, b.StokMinimum) {
			notif = &models.Notifikasi{
				IDStok: s.ID, IDRiwayat: &riwayat.ID, Tanggal: sekarang,
				Pesan: fmt.Sprintf("Stok %s di Cabang %d tinggal %d (batas minimum %d).", b.Judul, in.Cabang, sesudah, b.StokMinimum),
			}
			if err := tx.Create(notif).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if errors.Is(err, errBukuTidakAda) {
		respon.TidakAda(c, "Buku dengan kode "+c.Param("kode")+" tidak ditemukan.")
		return
	}
	if err != nil {
		respon.Dari(c, err)
		return
	}
	// TODO(Harits): kirim email notifikasi di latar belakang (goroutine/antrean), lalu set status_kirim = true.
	// Jika gagal, biarkan false supaya bisa dicoba ulang (Notifikasi.catatKegagalan()).

	buku, err := h.bukuDariKode(c, kode)
	if err != nil {
		respon.Server(c, err)
		return
	}
	hasil := gin.H{
		"buku": buku,
		"riwayat": riwayatJSON{
			ID: riwayat.ID, Tanggal: riwayat.Tanggal, IDUser: p.ID, Staff: p.Nama, Cabang: in.Cabang,
			Kode: kode, Judul: judul, Jenis: riwayat.Jenis, Jumlah: riwayat.Jumlah,
			Sebelum: riwayat.StokSebelum, Sesudah: riwayat.StokSesudah, Keterangan: riwayat.Keterangan,
		},
		"notifikasi": nil,
	}
	if notif != nil {
		hasil["notifikasi"] = notifikasiJSON{ID: notif.ID, Pesan: notif.Pesan, Tanggal: notif.Tanggal, StatusKirim: notif.StatusKirim}
	}
	respon.OK(c, hasil)
}
