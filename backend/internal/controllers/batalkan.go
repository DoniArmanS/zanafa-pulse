package controllers

import (
	"errors"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// Tombol "Batalkan" hanya muncul beberapa detik di toast; batas ini menutup celah
// supaya riwayat lama tidak bisa dihapus lewat panggilan API langsung.
const batasBatal = 10 * time.Minute

type errBatal struct {
	status string // "tidak_ada" | "akses" | "konflik"
	pesan  string
}

func (e errBatal) Error() string { return e.pesan }

// BatalkanPerubahan membatalkan perubahan TERAKHIR pada satu baris stok (tombol "Batalkan" di toast).
// DELETE /api/riwayat/:id  -> Buku terbaru, atau null kalau yang dibatalkan penambahan judul baru.
func (h *Controller) BatalkanPerubahan(c *gin.Context) {
	tidakAda := errBatal{"tidak_ada", "Perubahan ini sudah tidak bisa dibatalkan."}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		respon.TidakAda(c, tidakAda.pesan)
		return
	}
	p := middleware.Pengguna(c)

	kode := "" // kosong = bukunya ikut dihapus
	err = h.DB.WithContext(c).Transaction(func(tx *gorm.DB) error {
		var r models.RiwayatStok
		if err := tx.Where("id = ?", id).Take(&r).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return tidakAda
			}
			return err
		}
		// kunci baris stok, lalu baca ulang riwayatnya: bisa saja baru dibatalkan orang lain
		var s models.Stok
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", r.IDStok).Take(&s).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", id).Take(&r).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return tidakAda
			}
			return err
		}

		if !p.Manager() && r.IDPengguna != p.ID {
			return errBatal{"akses", "Perubahan ini disimpan orang lain. Hanya dia atau Manager yang bisa membatalkannya."}
		}
		if time.Since(r.Tanggal) > batasBatal {
			return errBatal{"konflik", "Perubahan ini sudah lebih dari 10 menit, jadi tidak bisa dibatalkan. Buat perubahan baru untuk mengoreksinya."}
		}
		var sesudahnya int64
		if err := tx.Model(&models.RiwayatStok{}).Where("id_stok = ? AND id > ?", r.IDStok, r.ID).Count(&sesudahnya).Error; err != nil {
			return err
		}
		if sesudahnya > 0 {
			return errBatal{"konflik", "Sudah ada perubahan lain setelah ini, jadi tidak bisa dibatalkan."}
		}

		if r.Jenis == models.JenisJudulBaru {
			return hapusJudulBaru(tx, r, s.IDBuku)
		}

		var b models.Buku
		if err := tx.Where("id = ?", s.IDBuku).Take(&b).Error; err != nil {
			return err
		}
		kode = b.Kode
		if err := tx.Model(&s).Updates(map[string]any{"jumlah": r.StokSebelum, "tanggal_update": time.Now().UTC()}).Error; err != nil {
			return err
		}
		// notifikasi yang dipicu perubahan ini ikut terhapus (ON DELETE CASCADE)
		return tx.Where("id = ?", r.ID).Delete(&models.RiwayatStok{}).Error
	})

	var eb errBatal
	if errors.As(err, &eb) {
		switch eb.status {
		case "akses":
			respon.Akses(c, eb.pesan)
		case "konflik":
			respon.Konflik(c, eb.pesan)
		default:
			respon.TidakAda(c, eb.pesan)
		}
		return
	}
	if err != nil {
		respon.Server(c, err)
		return
	}
	if kode == "" {
		respon.OK(c, nil)
		return
	}
	buku, err := h.bukuDariKode(c, kode)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		respon.OK(c, nil)
		return
	}
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, buku)
}

// hapusJudulBaru: membatalkan judul baru = menghapus bukunya, hanya kalau belum ada riwayat lain.
func hapusJudulBaru(tx *gorm.DB, r models.RiwayatStok, idBuku int) error {
	var stok []models.Stok
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id_buku = ?", idBuku).Order("id").Find(&stok).Error; err != nil {
		return err
	}
	ids := make([]int, len(stok))
	for i, s := range stok {
		ids[i] = s.ID
	}
	var lain int64
	if err := tx.Model(&models.RiwayatStok{}).Where("id_stok IN ? AND id <> ?", ids, r.ID).Count(&lain).Error; err != nil {
		return err
	}
	if lain > 0 {
		return errBatal{"konflik", "Stok buku ini sudah diubah di cabang lain, jadi penambahan judulnya tidak bisa dibatalkan."}
	}
	if err := tx.Where("id = ?", r.ID).Delete(&models.RiwayatStok{}).Error; err != nil {
		return err
	}
	if err := tx.Where("id_stok IN ?", ids).Delete(&models.Notifikasi{}).Error; err != nil {
		return err
	}
	if err := tx.Where("id_buku = ?", idBuku).Delete(&models.Stok{}).Error; err != nil {
		return err
	}
	return tx.Where("id = ?", idBuku).Delete(&models.Buku{}).Error
}
