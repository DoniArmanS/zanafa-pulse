package controllers_test

import (
	"net/url"
	"sort"
	"strings"
	"testing"
)

func TestKatalogDanCekStok(t *testing.T) {
	u := siapkan(t)
	kode := func(r jawaban) []string {
		var hasil []string
		for _, k := range kolom(daftar(r.Data, "items"), "kode") {
			hasil = append(hasil, k.(string))
		}
		sort.Strings(hasil)
		return hasil
	}
	semua := daftar(u.minta("GET", "/api/buku?per=100").Data, "items")
	saring := func(syarat func(stok []int, min int) bool) []string {
		var hasil []string
		for _, b := range semua {
			stok := []int{angka(b, "stok", 0), angka(b, "stok", 1), angka(b, "stok", 2)}
			if syarat(stok, angka(b, "min")) {
				hasil = append(hasil, teks(b, "kode"))
			}
		}
		sort.Strings(hasil)
		return hasil
	}

	t.Run("katalog bisa dibuka TANPA login (dipakai 'Cek stok tanpa login')", func(t *testing.T) {
		r := u.minta("GET", "/api/buku")
		sama(t, r.Status, 200)
		sama(t, []any{angka(r.Data, "total"), angka(r.Data, "halaman"), angka(r.Data, "totalHalaman"), angka(r.Data, "per"), angka(r.Data, "semua")}, []any{25, 1, 3, 10, 25})
		sama(t, len(daftar(r.Data, "items")), 10)
	})

	t.Run("bentuk satu buku sama dengan yang dipakai frontend", func(t *testing.T) {
		r := u.minta("GET", "/api/buku?q=BK-001")
		sama(t, ambil(r.Data, "items", 0), map[string]any{
			"kode": "BK-001", "judul": "Laut Bercerita", "pengarang": "Leila S. Chudori", "penerbit": "KPG",
			"kategori": "Novel", "tahun": 2017, "harga": 115000, "min": 5, "sampul": nil, "stok": []int{7, 1, 9},
		})
	})

	t.Run("urut judul (bawaan) dan urut kode", func(t *testing.T) {
		judul := kolom(semua, "judul")
		sama(t, []any{judul[0], judul[24]}, []any{"Atomic Habits", "Sirah Nabawiyah"})
		perKode := kolom(daftar(u.minta("GET", "/api/buku?per=100&urut=kode").Data, "items"), "kode")
		sama(t, []any{perKode[0], perKode[24]}, []any{"BK-001", "BK-025"})
	})

	t.Run("pencarian di kode, judul, pengarang, penerbit; tidak peka huruf besar/kecil", func(t *testing.T) {
		tere := u.minta("GET", "/api/buku?q=tere%20LIYE")
		sama(t, []any{angka(tere.Data, "total"), angka(tere.Data, "semua")}, []any{4, 25})
		sama(t, kode(u.minta("GET", "/api/buku?q=republika")), []string{"BK-018", "BK-023", "BK-024"})
	})

	t.Run("tanda % dan _ di kata kunci dicari sebagai huruf biasa, bukan wildcard", func(t *testing.T) {
		sama(t, angka(u.minta("GET", "/api/buku?q=%25").Data, "total"), 0)
		sama(t, angka(u.minta("GET", "/api/buku?q=_").Data, "total"), 0)
	})

	t.Run("percobaan SQL injection lewat kata kunci tidak berpengaruh", func(t *testing.T) {
		r := u.minta("GET", "/api/buku?q="+url.QueryEscape("'; DROP TABLE buku; --"))
		sama(t, []any{r.Status, angka(r.Data, "total")}, []any{200, 0})
		sama(t, angka(u.minta("GET", "/api/buku").Data, "semua"), 25)
	})

	t.Run("filter kategori", func(t *testing.T) {
		sama(t, kode(u.minta("GET", "/api/buku?kategori=Agama")), []string{"BK-016", "BK-017"})
	})

	t.Run("filter status: menipis = stok < minimum (bukan <=), kosong = stok 0", func(t *testing.T) {
		sama(t, kode(u.minta("GET", "/api/buku?status=menipis&per=100")),
			saring(func(s []int, min int) bool { return s[0] < min || s[1] < min || s[2] < min }))

		menipisC2 := kode(u.minta("GET", "/api/buku?status=menipis&cabang=2&per=100"))
		sama(t, menipisC2, saring(func(s []int, min int) bool { return s[1] < min }))
		benar(t, strings.Contains(strings.Join(menipisC2, ","), "BK-001") && !strings.Contains(strings.Join(menipisC2, ","), "BK-002"))

		sama(t, kode(u.minta("GET", "/api/buku?status=kosong&cabang=3")), []string{"BK-008", "BK-020"})
		sama(t, kode(u.minta("GET", "/api/buku?status=kosong")), []string{"BK-008", "BK-011", "BK-020"})
	})

	t.Run("paginasi: halaman 3 berisi sisa 5 buku; halaman kebesaran dijepit ke halaman terakhir", func(t *testing.T) {
		sama(t, len(daftar(u.minta("GET", "/api/buku?hal=3").Data, "items")), 5)
		sama(t, angka(u.minta("GET", "/api/buku?hal=99").Data, "halaman"), 3)
		per7 := u.minta("GET", "/api/buku?per=7")
		sama(t, []any{len(daftar(per7.Data, "items")), angka(per7.Data, "totalHalaman")}, []any{7, 4})
	})

	t.Run("cek stok antar cabang: satu buku, stok tiga cabang berdampingan", func(t *testing.T) {
		r := u.minta("GET", "/api/buku/bk-004") // huruf kecil pun boleh
		sama(t, []any{r.Status, teks(r.Data, "kode"), ambil(r.Data, "stok"), teks(r.Data, "sampul")},
			[]any{200, "BK-004", []int{18, 9, 3}, "assets/covers/dilan-1990.jpg"})
	})

	t.Run("buku tidak ada -> 404 TIDAK_ADA", func(t *testing.T) {
		r := u.minta("GET", "/api/buku/BK-999")
		galat(t, r, 404, "TIDAK_ADA")
		benar(t, strings.Contains(teks(r.Data, "pesan"), "BK-999"))
	})

	t.Run("GET /api/kategori -> nama kategori urut abjad", func(t *testing.T) {
		sama(t, u.minta("GET", "/api/kategori").Data,
			[]string{"Agama", "Bisnis", "Nonfiksi", "Novel", "Pendidikan", "Pengembangan diri", "Sastra", "Sejarah"})
	})
}
