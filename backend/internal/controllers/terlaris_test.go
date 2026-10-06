package controllers_test

import (
	"sort"
	"testing"
)

func TestBukuTerlaris(t *testing.T) {
	u := siapkan(t)
	rahmat := u.masuk("rahmat")
	ubah := func(kode string, body map[string]any) jawaban {
		return u.minta("POST", "/api/stok/"+kode+"/perubahan", opsi{Kue: rahmat, Body: body})
	}
	terjual := func(kode string) int {
		for _, b := range daftar(u.minta("GET", "/api/buku/terlaris?batas=50").Data) {
			if teks(b, "kode") == kode {
				return angka(b, "terjual")
			}
		}
		return 0
	}

	t.Run("publik, bawaan 5 buku, urut dari yang paling banyak keluar, tiap buku punya 'terjual'", func(t *testing.T) {
		r := u.minta("GET", "/api/buku/terlaris")
		sama(t, []any{r.Status, len(daftar(r.Data))}, []any{200, 5})
		var angkaTerjual []int
		for _, b := range daftar(r.Data) {
			angkaTerjual = append(angkaTerjual, angka(b, "terjual"))
			benar(t, angka(b, "terjual") > 0 && teks(b, "kode") != "" && teks(b, "judul") != "" && len(daftar(b, "stok")) == 3)
		}
		benar(t, sort.SliceIsSorted(angkaTerjual, func(i, j int) bool { return angkaTerjual[i] > angkaTerjual[j] }), "urut menurun")
	})

	t.Run("angkanya sama dengan jumlah riwayat 'kurang' 30 hari terakhir di database", func(t *testing.T) {
		var baris []struct {
			Kode   string
			Jumlah int
		}
		err := db.Raw(`SELECT b.kode, SUM(ABS(r.jumlah)) AS jumlah
			FROM riwayat_stok r JOIN stok s ON s.id = r.id_stok JOIN buku b ON b.id = s.id_buku
			WHERE r.jenis = 'kurang' AND r.tanggal >= now() - interval '30 days'
			GROUP BY b.kode`).Scan(&baris).Error
		if err != nil {
			t.Fatal(err)
		}
		harapan := map[string]int{}
		for _, b := range baris {
			harapan[b.Kode] = b.Jumlah
		}
		dapat := map[string]int{}
		for _, b := range daftar(u.minta("GET", "/api/buku/terlaris?batas=50").Data) {
			dapat[teks(b, "kode")] = angka(b, "terjual")
		}
		sama(t, dapat, harapan)
	})

	t.Run("hanya 'kurang' yang dihitung: tambah dan koreksi tidak membuat buku jadi terlaris", func(t *testing.T) {
		sebelum := terjual("BK-014")
		ubah("BK-014", map[string]any{"cabang": 1, "jenis": "tambah", "jumlah": 500})
		ubah("BK-014", map[string]any{"cabang": 1, "jenis": "koreksi", "jumlah": 400})
		sama(t, terjual("BK-014"), sebelum)

		ubah("BK-014", map[string]any{"cabang": 1, "jenis": "kurang", "jumlah": 300})
		r := u.minta("GET", "/api/buku/terlaris")
		sama(t, []any{teks(r.Data, 0, "kode"), angka(r.Data, 0, "terjual")}, []any{"BK-014", sebelum + 300})
	})

	t.Run("filter cabang, hari, dan batas", func(t *testing.T) {
		c1 := u.minta("GET", "/api/buku/terlaris?cabang=1&batas=1")
		sama(t, []any{len(daftar(c1.Data)), teks(c1.Data, 0, "kode")}, []any{1, "BK-014"})

		c2 := daftar(u.minta("GET", "/api/buku/terlaris?cabang=2&batas=3").Data)
		sama(t, len(c2), 3)
		for _, b := range c2 {
			benar(t, !(teks(b, "kode") == "BK-014" && angka(b, "terjual") >= 300), "penjualan Cabang 1 tidak ikut dihitung di Cabang 2")
		}
		seminggu := daftar(u.minta("GET", "/api/buku/terlaris?hari=7&batas=50").Data)
		sebulan := daftar(u.minta("GET", "/api/buku/terlaris?hari=30&batas=50").Data)
		benar(t, len(seminggu) > 0 && len(seminggu) <= len(sebulan))
	})

	t.Run("'terlaris' tidak dianggap sebagai kode buku", func(t *testing.T) {
		_, berupaDaftar := u.minta("GET", "/api/buku/terlaris").Data.([]any)
		benar(t, berupaDaftar)
		// huruf besar tidak cocok dengan rutenya, jadi dicari sebagai kode buku (dan kode itu dilarang)
		galat(t, u.minta("GET", "/api/buku/TERLARIS"), 404, "TIDAK_ADA")
	})
}
