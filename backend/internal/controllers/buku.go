package controllers

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// bukuJSON = bentuk Buku yang dipakai frontend (lihat BACKEND-INTEGRATION.md).
// Stok[0] = Cabang 1, Stok[1] = Cabang 2, dst.
type bukuJSON struct {
	Kode      string  `json:"kode"`
	Judul     string  `json:"judul"`
	Pengarang string  `json:"pengarang"`
	Penerbit  string  `json:"penerbit"`
	Kategori  string  `json:"kategori"`
	Tahun     int     `json:"tahun"`
	Harga     float64 `json:"harga"`
	Min       int     `json:"min"`
	Sampul    *string `json:"sampul"`
	Stok      []int   `json:"stok"`
	id        int
}

type halamanJSON[T any] struct {
	Items        []T   `json:"items"`
	Total        int64 `json:"total"`
	Halaman      int   `json:"halaman"`
	TotalHalaman int   `json:"totalHalaman"`
	Per          int   `json:"per"`
	Semua        int64 `json:"semua"`
}

// Kategori = Kategori.read().
// GET /api/kategori
func (h *Controller) Kategori(c *gin.Context) {
	var nama []string
	if err := h.DB.WithContext(c).Table("kategori").Order("nama").Pluck("nama", &nama).Error; err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, nama)
}

// DaftarBuku = Buku.cariBuku(). Publik (dipakai juga oleh "Cek stok tanpa login").
// GET /api/buku?q=&kategori=&status=menipis|kosong&cabang=1&hal=1&per=10&urut=judul|kode
func (h *Controller) DaftarBuku(c *gin.Context) {
	hal := angkaQuery(c, "hal", 1, 1, 100000)
	per := angkaQuery(c, "per", 10, 1, 100)
	cabang := angkaQuery(c, "cabang", 0, 0, 1000)

	dasar := func() *gorm.DB {
		return h.DB.WithContext(c).Table("buku b").Joins("JOIN kategori k ON k.id = b.id_kategori").Where("b.status")
	}
	// saring dipakai ulang untuk menghitung total dan mengambil data; tiap pemanggilan membuat query baru.
	kata := strings.TrimSpace(c.Query("q"))
	kat := c.Query("kategori")
	status := c.Query("status")
	saring := func() *gorm.DB {
		q := dasar()
		if kata != "" {
			pola := "%" + escapeLike(kata) + "%"
			q = q.Where("(b.kode ILIKE ? OR b.judul ILIKE ? OR b.pengarang ILIKE ? OR b.penerbit ILIKE ?)", pola, pola, pola, pola)
		}
		if kat != "" {
			q = q.Where("k.nama = ?", kat)
		}
		kondisi := map[string]string{"menipis": "s.jumlah < b.stok_minimum", "kosong": "s.jumlah = 0"}[status]
		if kondisi != "" {
			if cabang > 0 {
				q = q.Where("EXISTS (SELECT 1 FROM stok s WHERE s.id_buku = b.id AND "+kondisi+" AND s.id_cabang = ?)", cabang)
			} else {
				q = q.Where("EXISTS (SELECT 1 FROM stok s WHERE s.id_buku = b.id AND " + kondisi + ")")
			}
		}
		return q
	}

	var total, semua int64
	if err := saring().Count(&total).Error; err != nil {
		respon.Server(c, err)
		return
	}
	if err := dasar().Count(&semua).Error; err != nil {
		respon.Server(c, err)
		return
	}
	totalHalaman := int((total + int64(per) - 1) / int64(per))
	if totalHalaman < 1 {
		totalHalaman = 1
	}
	if hal > totalHalaman {
		hal = totalHalaman
	}
	urut := "b.judul"
	if c.Query("urut") == "kode" {
		urut = "b.kode"
	}

	items, err := h.ambilBuku(c, saring().Order(urut).Offset((hal-1)*per).Limit(per))
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, halamanJSON[bukuJSON]{Items: items, Total: total, Halaman: hal, TotalHalaman: totalHalaman, Per: per, Semua: semua})
}

// DetailBuku = Buku.getInfoBuku() + Stok.lihatStokAntarCabang(). Publik.
// GET /api/buku/:kode
func (h *Controller) DetailBuku(c *gin.Context) {
	b, err := h.bukuDariKode(c, c.Param("kode"))
	if errors.Is(err, gorm.ErrRecordNotFound) {
		respon.TidakAda(c, "Buku dengan kode "+c.Param("kode")+" tidak ditemukan.")
		return
	}
	if err != nil {
		respon.Server(c, err)
		return
	}
	respon.OK(c, b)
}

func (h *Controller) bukuDariKode(ctx context.Context, kode string) (bukuJSON, error) {
	q := h.DB.WithContext(ctx).Table("buku b").Joins("JOIN kategori k ON k.id = b.id_kategori").
		Where("lower(b.kode) = lower(?) AND b.status", kode)
	items, err := h.ambilBuku(ctx, q)
	if err != nil {
		return bukuJSON{}, err
	}
	if len(items) == 0 {
		return bukuJSON{}, gorm.ErrRecordNotFound
	}
	return items[0], nil
}

// ambilBuku menjalankan query buku lalu melengkapi stok tiap cabang dalam satu query tambahan.
func (h *Controller) ambilBuku(ctx context.Context, q *gorm.DB) ([]bukuJSON, error) {
	var baris []struct {
		ID          int
		Kode        string
		Judul       string
		Pengarang   string
		Penerbit    string
		Kategori    string
		Tahun       int
		Harga       float64
		StokMinimum int
		Sampul      *string
	}
	err := q.Select("b.id, b.kode, b.judul, b.pengarang, b.penerbit, k.nama AS kategori, b.tahun, b.harga, b.stok_minimum, b.sampul").
		Scan(&baris).Error
	if err != nil {
		return nil, err
	}
	var jumlahCabang int64
	if err := h.DB.WithContext(ctx).Table("cabang").Count(&jumlahCabang).Error; err != nil {
		return nil, err
	}

	items := make([]bukuJSON, len(baris))
	ids := make([]int, len(baris))
	posisi := map[int]int{}
	for i, r := range baris {
		items[i] = bukuJSON{
			Kode: r.Kode, Judul: r.Judul, Pengarang: r.Pengarang, Penerbit: r.Penerbit, Kategori: r.Kategori,
			Tahun: r.Tahun, Harga: r.Harga, Min: r.StokMinimum, Sampul: r.Sampul,
			Stok: make([]int, jumlahCabang), id: r.ID,
		}
		ids[i] = r.ID
		posisi[r.ID] = i
	}
	if len(ids) == 0 {
		return items, nil
	}
	var stok []struct{ IDBuku, IDCabang, Jumlah int }
	if err := h.DB.WithContext(ctx).Table("stok").Select("id_buku, id_cabang, jumlah").Where("id_buku IN ?", ids).Scan(&stok).Error; err != nil {
		return nil, err
	}
	for _, s := range stok {
		if i, ok := posisi[s.IDBuku]; ok && s.IDCabang >= 1 && s.IDCabang <= len(items[i].Stok) {
			items[i].Stok[s.IDCabang-1] = s.Jumlah
		}
	}
	return items, nil
}

func angkaQuery(c *gin.Context, nama string, bawaan, min, maks int) int {
	n, err := strconv.Atoi(c.Query(nama))
	if err != nil || n < min {
		return bawaan
	}
	if n > maks {
		return maks
	}
	return n
}

// escapeLike mencegah % dan _ dari pengguna dianggap wildcard oleh ILIKE.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
