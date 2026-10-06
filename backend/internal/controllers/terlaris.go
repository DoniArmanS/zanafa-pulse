package controllers

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

type bukuTerlarisJSON struct {
	bukuJSON
	Terjual int `json:"terjual"`
}

// Terlaris = RiwayatStok.getBukuTerlaris(). Publik.
// GET /api/buku/terlaris?cabang=&hari=30&batas=5
func (h *Controller) Terlaris(c *gin.Context) {
	cabang := angkaQuery(c, "cabang", 0, 0, 1000)
	hari := angkaQuery(c, "hari", 30, 1, 365)
	batas := angkaQuery(c, "batas", 5, 1, 50)

	items, err := h.terlaris(c, cabang, hari, batas)
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, items)
}

// terlaris menjumlahkan riwayat jenis 'kurang' per buku. cabang 0 = semua cabang.
// Dipakai juga oleh dashboard Staff.
func (h *Controller) terlaris(ctx context.Context, cabang, hari, batas int) ([]bukuTerlarisJSON, error) {
	var peringkat []struct {
		IDBuku  int
		Terjual int
	}
	q := h.DB.WithContext(ctx).Table("riwayat_stok r").
		Joins("JOIN stok s ON s.id = r.id_stok").
		Joins("JOIN buku b ON b.id = s.id_buku AND b.status").
		Where("r.jenis = ? AND r.tanggal >= now() - make_interval(days => ?)", models.JenisKurang, hari)
	if cabang > 0 {
		q = q.Where("s.id_cabang = ?", cabang)
	}
	err := q.Select("s.id_buku, SUM(ABS(r.jumlah)) AS terjual").
		Group("s.id_buku").Order("terjual DESC, s.id_buku").Limit(batas).Scan(&peringkat).Error
	if err != nil {
		return nil, err
	}

	hasil := make([]bukuTerlarisJSON, 0, len(peringkat))
	if len(peringkat) == 0 {
		return hasil, nil
	}
	ids := make([]int, len(peringkat))
	for i, p := range peringkat {
		ids[i] = p.IDBuku
	}
	buku, err := h.ambilBuku(ctx, h.DB.WithContext(ctx).Table("buku b").
		Joins("JOIN kategori k ON k.id = b.id_kategori").Where("b.id IN ?", ids))
	if err != nil {
		return nil, err
	}
	perID := map[int]bukuJSON{}
	for _, b := range buku {
		perID[b.id] = b
	}
	for _, p := range peringkat {
		if b, ok := perID[p.IDBuku]; ok {
			hasil = append(hasil, bukuTerlarisJSON{bukuJSON: b, Terjual: p.Terjual})
		}
	}
	return hasil, nil
}
