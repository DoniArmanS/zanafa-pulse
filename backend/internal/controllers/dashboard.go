package controllers

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

const (
	hariTerjual = 30
	hariTren    = 14
)

type ringkasCabangJSON struct {
	Cabang        int   `json:"cabang"`
	JudulTersedia int   `json:"judulTersedia"`
	Eksemplar     int   `json:"eksemplar"`
	Menipis       int   `json:"menipis"`
	Kosong        int   `json:"kosong"`
	Terjual30     int   `json:"terjual30"`
	Tren          []int `json:"tren"`
}

// ringkasanCabang menghitung angka dashboard untuk semua cabang sekaligus.
// Mengembalikan juga jumlah judul aktif.
func (h *Controller) ringkasanCabang(ctx context.Context) ([]ringkasCabangJSON, int, error) {
	db := h.DB.WithContext(ctx)

	var totalJudul int64
	if err := db.Table("buku").Where("status").Count(&totalJudul).Error; err != nil {
		return nil, 0, err
	}

	var baris []struct {
		Cabang        int
		JudulTersedia int
		Eksemplar     int
		Menipis       int
		Kosong        int
	}
	err := db.Raw(`
		SELECT c.id AS cabang,
		       COUNT(b.id) FILTER (WHERE COALESCE(s.jumlah, 0) > 0) AS judul_tersedia,
		       COALESCE(SUM(s.jumlah), 0) AS eksemplar,
		       COUNT(b.id) FILTER (WHERE COALESCE(s.jumlah, 0) < b.stok_minimum) AS menipis,
		       COUNT(b.id) FILTER (WHERE COALESCE(s.jumlah, 0) = 0) AS kosong
		FROM cabang c
		LEFT JOIN buku b ON b.status
		LEFT JOIN stok s ON s.id_buku = b.id AND s.id_cabang = c.id
		GROUP BY c.id
		ORDER BY c.id`).Scan(&baris).Error
	if err != nil {
		return nil, 0, err
	}

	var terjual []struct{ Cabang, Terjual int }
	err = db.Raw(`
		SELECT s.id_cabang AS cabang, SUM(ABS(r.jumlah)) AS terjual
		FROM riwayat_stok r
		JOIN stok s ON s.id = r.id_stok
		JOIN buku b ON b.id = s.id_buku AND b.status
		WHERE r.jenis = 'kurang' AND r.tanggal >= now() - make_interval(days => ?)
		GROUP BY s.id_cabang`, hariTerjual).Scan(&terjual).Error
	if err != nil {
		return nil, 0, err
	}
	terjualPer := map[int]int{}
	for _, t := range terjual {
		terjualPer[t.Cabang] = t.Terjual
	}

	// satu baris per cabang per hari (lama -> baru); hari dihitung menurut jam toko
	var tren []struct{ Cabang, Jumlah int }
	err = db.Raw(`
		WITH kalender AS (
		  SELECT generate_series(0, ? - 1) AS urutan,
		         (now() AT TIME ZONE '`+zonaToko+`')::date - (? - 1) AS awal
		)
		SELECT c.id AS cabang,
		       COALESCE((
		         SELECT SUM(ABS(r.jumlah))
		         FROM riwayat_stok r
		         JOIN stok s ON s.id = r.id_stok
		         JOIN buku b ON b.id = s.id_buku AND b.status
		         WHERE r.jenis = 'kurang' AND s.id_cabang = c.id
		           AND (r.tanggal AT TIME ZONE '`+zonaToko+`')::date = k.awal + k.urutan
		       ), 0) AS jumlah
		FROM cabang c CROSS JOIN kalender k
		ORDER BY c.id, k.urutan`, hariTren, hariTren).Scan(&tren).Error
	if err != nil {
		return nil, 0, err
	}
	trenPer := map[int][]int{}
	for _, t := range tren {
		trenPer[t.Cabang] = append(trenPer[t.Cabang], t.Jumlah)
	}

	hasil := make([]ringkasCabangJSON, len(baris))
	for i, b := range baris {
		t := trenPer[b.Cabang]
		if len(t) != hariTren {
			t = make([]int, hariTren)
		}
		hasil[i] = ringkasCabangJSON{
			Cabang: b.Cabang, JudulTersedia: b.JudulTersedia, Eksemplar: b.Eksemplar,
			Menipis: b.Menipis, Kosong: b.Kosong, Terjual30: terjualPer[b.Cabang], Tren: t,
		}
	}
	return hasil, int(totalJudul), nil
}

// DashboardStaff = ringkasan satu cabang. Cabang diambil dari akun yang login.
// GET /api/dashboard/staff
func (h *Controller) DashboardStaff(c *gin.Context) {
	p := middleware.Pengguna(c)
	if p.IDCabang == nil {
		respon.Akses(c, "Dashboard ini untuk Staff cabang. Manager memakai dashboard semua cabang.")
		return
	}
	cabang := *p.IDCabang

	semua, totalJudul, err := h.ringkasanCabang(c)
	if err != nil {
		respon.Server(c, err)
		return
	}
	var r ringkasCabangJSON
	for _, x := range semua {
		if x.Cabang == cabang {
			r = x
		}
	}
	if r.Tren == nil {
		r.Tren = make([]int, hariTren)
	}

	menipis, err := h.ambilBuku(c, h.DB.WithContext(c).Table("buku b").
		Joins("JOIN kategori k ON k.id = b.id_kategori").
		Joins("JOIN stok sc ON sc.id_buku = b.id AND sc.id_cabang = ?", cabang).
		Where("b.status AND sc.jumlah < b.stok_minimum").
		Order("sc.jumlah, b.judul"))
	if err != nil {
		respon.Server(c, err)
		return
	}
	terlaris, err := h.terlaris(c, cabang, hariTerjual, 5)
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, gin.H{
		"cabang": cabang, "totalJudul": totalJudul, "judulTersedia": r.JudulTersedia, "eksemplar": r.Eksemplar,
		"menipis": menipis, "terjual30": r.Terjual30, "tren": r.Tren, "terlaris": terlaris,
	})
}

type menipisJSON struct {
	Kode       string          `json:"kode"`
	Judul      string          `json:"judul"`
	Cabang     int             `json:"cabang"`
	Stok       int             `json:"stok"`
	Min        int             `json:"min"`
	Notifikasi *notifikasiJSON `json:"notifikasi"`
}

// DashboardManager = ringkasan semua cabang, aktivitas terbaru, dan stok menipis beserta status emailnya.
// GET /api/dashboard/manager
func (h *Controller) DashboardManager(c *gin.Context) {
	perCabang, totalJudul, err := h.ringkasanCabang(c)
	if err != nil {
		respon.Server(c, err)
		return
	}

	aktivitas := []riwayatJSON{}
	err = h.kueriRiwayat(c, saringRiwayat{}).Select(kolomRiwayat).
		Order("r.tanggal DESC, r.id DESC").Limit(7).Scan(&aktivitas).Error
	if err != nil {
		respon.Server(c, err)
		return
	}

	var baris []struct {
		IDStok int
		Kode   string
		Judul  string
		Cabang int
		Stok   int
		Min    int
	}
	err = h.DB.WithContext(c).Raw(`
		SELECT s.id AS id_stok, b.kode, b.judul, s.id_cabang AS cabang, s.jumlah AS stok, b.stok_minimum AS min
		FROM stok s
		JOIN buku b ON b.id = s.id_buku
		WHERE b.status AND s.jumlah < b.stok_minimum
		ORDER BY s.jumlah, b.judul, s.id_cabang`).Scan(&baris).Error
	if err != nil {
		respon.Server(c, err)
		return
	}

	// notifikasi terakhir tiap baris stok, untuk kolom status email
	terakhir := map[int]*notifikasiJSON{}
	if len(baris) > 0 {
		ids := make([]int, len(baris))
		for i, b := range baris {
			ids[i] = b.IDStok
		}
		var notif []models.Notifikasi
		err = h.DB.WithContext(c).Raw(`
			SELECT DISTINCT ON (id_stok) id, id_stok, pesan, tanggal, status_kirim
			FROM notifikasi
			WHERE id_stok IN ?
			ORDER BY id_stok, id DESC`, ids).Scan(&notif).Error
		if err != nil {
			respon.Server(c, err)
			return
		}
		for _, n := range notif {
			terakhir[n.IDStok] = &notifikasiJSON{ID: n.ID, Pesan: n.Pesan, Tanggal: n.Tanggal, StatusKirim: n.StatusKirim}
		}
	}

	menipis := make([]menipisJSON, len(baris))
	for i, b := range baris {
		menipis[i] = menipisJSON{Kode: b.Kode, Judul: b.Judul, Cabang: b.Cabang, Stok: b.Stok, Min: b.Min, Notifikasi: terakhir[b.IDStok]}
	}
	respon.OK(c, gin.H{"totalJudul": totalJudul, "perCabang": perCabang, "aktivitas": aktivitas, "menipis": menipis})
}
