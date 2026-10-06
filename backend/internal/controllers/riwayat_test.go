package controllers_test

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"testing"
)

func TestRiwayatDanLaporan(t *testing.T) {
	u := siapkan(t)
	sari, rahmat := u.masuk("sari"), u.masuk("rahmat")
	riwayat := func(kueri, kue string) jawaban { return u.minta("GET", "/api/riwayat"+kueri, opsi{Kue: kue}) }
	jumlah := func(syarat string, arg ...any) int {
		return hitung(t, "SELECT COUNT(*) FROM riwayat_stok r JOIN stok s ON s.id = r.id_stok JOIN buku b ON b.id = s.id_buku WHERE "+syarat, arg...)
	}
	const tglToko = "(r.tanggal AT TIME ZONE 'Asia/Jakarta')::date"
	kunciRiwayat := []string{"cabang", "id", "idUser", "jenis", "judul", "jumlah", "keterangan", "kode", "sebelum", "sesudah", "staff", "tanggal"}

	t.Run("HANYA MANAGER: tanpa login 401, Staff 403, Manager 200", func(t *testing.T) {
		galat(t, riwayat("", ""), 401, "SESI")
		galat(t, riwayat("", sari), 403, "AKSES")
		sama(t, riwayat("", rahmat).Status, 200)

		galat(t, u.minta("GET", "/api/laporan/riwayat.csv"), 401, "SESI")
		galat(t, u.minta("GET", "/api/laporan/riwayat.csv", opsi{Kue: sari}), 403, "AKSES")
		// ?kode= kosong tidak boleh lolos
		sama(t, riwayat("?kode=", sari).Status, 403)
		sama(t, riwayat("?kode=%20", sari).Status, 403)
	})

	t.Run("Staff boleh melihat riwayat SATU buku (untuk layar Ubah jumlah stok)", func(t *testing.T) {
		r := riwayat("?kode=bk-001&cabang=1&per=6", sari)
		items := daftar(r.Data, "items")
		benar(t, r.Status == 200 && len(items) > 0 && len(items) <= 6)
		for _, x := range items {
			sama(t, []any{teks(x, "kode"), angka(x, "cabang")}, []any{"BK-001", 1})
		}
	})

	t.Run("daftar berhalaman, terbaru di atas, dengan ringkasan per jenis", func(t *testing.T) {
		r := riwayat("", rahmat)
		total := jumlah("TRUE")
		sama(t, []any{angka(r.Data, "total"), angka(r.Data, "halaman"), angka(r.Data, "per"), angka(r.Data, "totalHalaman")},
			[]any{total, 1, 15, (total + 14) / 15})
		items := daftar(r.Data, "items")
		sama(t, len(items), 15)
		benar(t, sort.SliceIsSorted(items, func(i, j int) bool { return waktu(t, items[i], "tanggal").After(waktu(t, items[j], "tanggal")) }), "terbaru di atas")

		ringkas := ambil(r.Data, "ringkas").(map[string]any)
		sama(t, []any{len(ringkas), angka(ringkas, "tambah") + angka(ringkas, "kurang") + angka(ringkas, "koreksi") + angka(ringkas, "judul_baru")}, []any{4, total})
		sama(t, angka(ringkas, "kurang"), jumlah("r.jenis = 'kurang'"))

		var kunci []string
		for k := range items[0].(map[string]any) {
			kunci = append(kunci, k)
		}
		sort.Strings(kunci)
		sama(t, kunci, kunciRiwayat)

		terakhir := riwayat(fmt.Sprint("?hal=", angka(r.Data, "totalHalaman")), rahmat)
		sama(t, len(daftar(terakhir.Data, "items")), total-15*(angka(r.Data, "totalHalaman")-1))
		sama(t, angka(riwayat("?hal=9999", rahmat).Data, "halaman"), angka(r.Data, "totalHalaman"), "halaman kebesaran dijepit")
	})

	t.Run("filter cabang, nama staff, dan jenis", func(t *testing.T) {
		c2 := riwayat("?cabang=2&per=100", rahmat)
		sama(t, angka(c2.Data, "total"), jumlah("s.id_cabang = 2"))
		for _, x := range daftar(c2.Data, "items") {
			sama(t, angka(x, "cabang"), 2)
		}
		olehManager := riwayat("?staff=4&per=100", rahmat)
		sama(t, angka(olehManager.Data, "total"), jumlah("r.id_pengguna = 4"))
		for _, x := range daftar(olehManager.Data, "items") {
			sama(t, teks(x, "staff"), "Rahmat Hidayat")
		}
		gabung := riwayat("?cabang=3&staff=3&jenis=tambah&per=100", rahmat)
		n := jumlah("s.id_cabang = 3 AND r.id_pengguna = 3 AND r.jenis = 'tambah'")
		sama(t, []any{angka(gabung.Data, "total"), ambil(gabung.Data, "ringkas")},
			[]any{n, map[string]int{"tambah": n, "kurang": 0, "koreksi": 0, "judul_baru": 0}})
		kosong := riwayat("?jenis=judul_baru", rahmat)
		sama(t, []any{kosong.Status, ambil(kosong.Data, "items"), angka(kosong.Data, "totalHalaman")}, []any{200, []any{}, 1}, "hasil kosong tetap berupa daftar")
	})

	t.Run("filter rentang waktu memakai tanggal menurut jam toko (WIB)", func(t *testing.T) {
		// tanggal (WIB) dari riwayat ke-50, pasti ada datanya
		var baris []struct{ Tgl string }
		err := db.Raw("SELECT to_char(tanggal AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tgl FROM riwayat_stok ORDER BY tanggal OFFSET 50 LIMIT 1").Scan(&baris).Error
		if err != nil || len(baris) != 1 {
			t.Fatal(err)
		}
		tgl := baris[0].Tgl
		harapan := jumlah(tglToko+" = (?::text)::date", tgl)
		benar(t, harapan > 0)
		sama(t, angka(riwayat("?dari="+tgl+"&sampai="+tgl+"&per=100", rahmat).Data, "total"), harapan)
		sama(t, angka(riwayat("?dari="+tgl, rahmat).Data, "total"), jumlah(tglToko+" >= (?::text)::date", tgl))
		sama(t, angka(riwayat("?sampai="+tgl, rahmat).Data, "total"), jumlah(tglToko+" <= (?::text)::date", tgl))
	})

	t.Run("pencarian di judul, kode, dan keterangan", func(t *testing.T) {
		r := riwayat("?q=opname&per=100", rahmat)
		benar(t, angka(r.Data, "total") > 0)
		for _, x := range daftar(r.Data, "items") {
			benar(t, strings.Contains(strings.ToLower(teks(x, "keterangan")), "opname"))
		}
		sama(t, angka(riwayat("?q=bk-003", rahmat).Data, "total"), jumlah("b.kode = 'BK-003'"))
	})

	t.Run("filter salah -> 422 dengan nama field", func(t *testing.T) {
		for _, k := range [][2]string{{"?dari=05-10-2026", "dari"}, {"?sampai=2026-02-30", "sampai"}, {"?dari=2026-10-05&sampai=2026-10-01", "dari"}, {"?jenis=hapus", "jenis"}} {
			galat(t, riwayat(k[0], rahmat), 422, "VALIDASI", k[1])
			galat(t, u.minta("GET", "/api/laporan/riwayat.csv"+k[0], opsi{Kue: rahmat}), 422, "VALIDASI", k[1])
		}
	})

	t.Run("ekspor CSV mengikuti filter, punya BOM, kepala kolom, dan jumlah baris yang benar", func(t *testing.T) {
		laporanSebelum := hitung(t, "SELECT COUNT(*) FROM laporan")
		r := u.minta("GET", "/api/laporan/riwayat.csv?cabang=1&jenis=kurang", opsi{Kue: rahmat})
		sama(t, r.Status, 200)
		benar(t, strings.HasPrefix(r.Kepala.Get("Content-Type"), "text/csv"))
		sama(t, r.Kepala.Get("Content-Disposition"), `attachment; filename="riwayat-stok_cabang-1_awal_sekarang.csv"`)
		sama(t, []byte(r.Mentah[:3]), []byte{0xef, 0xbb, 0xbf}, "tiga byte pertama adalah BOM")

		baris := strings.Split(string(r.Mentah[3:]), "\r\n")
		sama(t, baris[0], "tanggal,waktu,staff,cabang,kode,judul,jenis,jumlah,stok_sebelum,stok_sesudah,keterangan")
		harapan := jumlah("s.id_cabang = 1 AND r.jenis = 'kurang'")
		sama(t, []any{len(baris) - 1, r.Kepala.Get("X-Jumlah-Baris")}, []any{harapan, fmt.Sprint(harapan)})
		benar(t, regexp.MustCompile(`^\d{4}-\d{2}-\d{2},\d{2}:\d{2},"[^"]+",1,"BK-\d{3}","[^"]+","Kurang",-\d+,\d+,\d+,"[^"]*"$`).MatchString(baris[1]), baris[1])

		sama(t, hitung(t, "SELECT COUNT(*) FROM laporan"), laporanSebelum+1, "ekspor dicatat di tabel laporan")
		sama(t, hitung(t, "SELECT id_pengguna FROM laporan ORDER BY id DESC LIMIT 1"), 4, "pelakunya Manager")
	})

	t.Run("nama file CSV memuat rentang tanggal yang dipilih", func(t *testing.T) {
		r := u.minta("GET", "/api/laporan/riwayat.csv?dari=2026-01-01&sampai=2026-12-31", opsi{Kue: rahmat})
		sama(t, r.Kepala.Get("Content-Disposition"), `attachment; filename="riwayat-stok_semua-cabang_2026-01-01_2026-12-31.csv"`)
	})

	t.Run("CSV aman dari formula injection: teks berawalan = + - @ diberi tanda petik", func(t *testing.T) {
		u.minta("POST", "/api/stok/BK-001/perubahan", opsi{Kue: rahmat, Body: map[string]any{
			"cabang": 1, "jenis": "tambah", "jumlah": 1, "keterangan": `=HYPERLINK("http://jahat","klik")`}})
		r := u.minta("GET", "/api/laporan/riwayat.csv?q=HYPERLINK", opsi{Kue: rahmat})
		baris := strings.Split(string(r.Mentah), "\r\n")
		sama(t, len(baris), 2)
		benar(t, strings.HasSuffix(baris[1], `"'=HYPERLINK(""http://jahat"",""klik"")"`), baris[1])
	})
}
