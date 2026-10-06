package controllers_test

import (
	"encoding/base64"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestKelolaStok(t *testing.T) {
	u := siapkan(t)
	sari, dimas, rahmat := u.masuk("sari"), u.masuk("dimas"), u.masuk("rahmat")

	type M = map[string]any
	ubah := func(kue, kode string, body M) jawaban {
		return u.minta("POST", "/api/stok/"+kode+"/perubahan", opsi{Kue: kue, Body: body})
	}
	batalkan := func(kue string, idRiwayat int) jawaban {
		return u.minta("DELETE", fmt.Sprint("/api/riwayat/", idRiwayat), opsi{Kue: kue})
	}
	stok := func(kode string) any { return ambil(u.minta("GET", "/api/buku/"+kode).Data, "stok") }
	jumlahRiwayat := func() int { return hitung(t, "SELECT COUNT(*) FROM riwayat_stok") }
	jumlahBuku := func() int { return angka(u.minta("GET", "/api/buku").Data, "semua") }

	t.Run("tanpa login -> 401 SESI", func(t *testing.T) {
		galat(t, ubah("", "BK-002", M{"cabang": 1, "jenis": "tambah", "jumlah": 1}), 401, "SESI")
		galat(t, batalkan("", 1), 401, "SESI")
		galat(t, u.minta("POST", "/api/buku", opsi{Body: M{"kode": "BK-900"}}), 401, "SESI")
	})

	t.Run("kurang: stok turun, riwayat mencatat selisih negatif, sebelum, sesudah, dan pelakunya", func(t *testing.T) {
		r := ubah(sari, "BK-002", M{"cabang": 1, "jenis": "kurang", "jumlah": 2, "keterangan": "  Terjual  "})
		sama(t, r.Status, 200)
		sama(t, ambil(r.Data, "buku", "stok"), []int{10, 8, 6})
		riwayat := ambil(r.Data, "riwayat").(map[string]any)
		benar(t, angka(riwayat, "id") > 0 && time.Since(waktu(t, riwayat, "tanggal")) < time.Minute, "id dan tanggal terisi")
		delete(riwayat, "id")
		delete(riwayat, "tanggal")
		sama(t, riwayat, M{
			"idUser": 1, "staff": "Sari Wulandari", "cabang": 1, "kode": "BK-002", "judul": "Bumi Manusia",
			"jenis": "kurang", "jumlah": -2, "sebelum": 12, "sesudah": 10, "keterangan": "Terjual",
		})
		sama(t, ambil(r.Data, "notifikasi"), nil, "10 masih di atas minimum 5")
	})

	t.Run("STOK TIDAK BOLEH NEGATIF: kurang melebihi stok ditolak dan tidak ada yang berubah", func(t *testing.T) {
		sebelum := jumlahRiwayat()
		r := ubah(sari, "BK-002", M{"cabang": 1, "jenis": "kurang", "jumlah": 11})
		galat(t, r, 422, "VALIDASI", "jumlah")
		sama(t, teks(r.Data, "pesan"), "Stok Cabang 1 tinggal 10. Jumlah yang dikurangi tidak boleh lebih dari 10.")
		sama(t, stok("BK-002"), []int{10, 8, 6})
		sama(t, jumlahRiwayat(), sebelum)
	})

	t.Run("database sendiri menolak stok negatif (penjaga terakhir)", func(t *testing.T) {
		err := db.Exec("UPDATE stok SET jumlah = -1 WHERE id = 1").Error
		sama(t, kodeSQL(err), "23514", "23514 = melanggar aturan CHECK")
	})

	t.Run("tambah dan koreksi", func(t *testing.T) {
		tambah := ubah(sari, "BK-002", M{"cabang": 1, "jenis": "tambah", "jumlah": 5})
		sama(t, []any{angka(tambah.Data, "riwayat", "jumlah"), angka(tambah.Data, "riwayat", "sesudah")}, []any{5, 15})

		koreksi := ambil(ubah(sari, "BK-002", M{"cabang": 1, "jenis": "koreksi", "jumlah": 12}).Data, "riwayat")
		sama(t, []any{teks(koreksi, "jenis"), angka(koreksi, "jumlah"), angka(koreksi, "sebelum"), angka(koreksi, "sesudah")}, []any{"koreksi", -3, 15, 12})
	})

	t.Run("isian salah -> 422 dengan nama field", func(t *testing.T) {
		kasus := []struct {
			body  M
			field string
		}{
			{M{"cabang": 1, "jenis": "tambah", "jumlah": 0}, "jumlah"},
			{M{"cabang": 1, "jenis": "kurang", "jumlah": 0}, "jumlah"},
			{M{"cabang": 1, "jenis": "koreksi", "jumlah": -1}, "jumlah"},
			{M{"cabang": 1, "jenis": "koreksi", "jumlah": 12}, "jumlah"}, // sama dengan stok sekarang
			{M{"cabang": 1, "jenis": "tambah", "jumlah": 1.5}, "jumlah"},
			{M{"cabang": 1, "jenis": "tambah", "jumlah": "banyak"}, "jumlah"},
			{M{"cabang": 1, "jenis": "tambah"}, "jumlah"},
			{M{"cabang": 1, "jenis": "hapus", "jumlah": 1}, "jenis"},
			{M{"cabang": 7, "jenis": "tambah", "jumlah": 1}, "cabang"},
			{M{"jenis": "tambah", "jumlah": 1}, "cabang"},
			{M{"cabang": 1, "jenis": "tambah", "jumlah": 1, "keterangan": strings.Repeat("x", 141)}, "keterangan"},
		}
		for _, k := range kasus {
			galat(t, ubah(rahmat, "BK-002", k.body), 422, "VALIDASI", k.field)
		}
		sama(t, stok("BK-002"), []int{12, 8, 6})
	})

	t.Run("Staff hanya boleh cabangnya sendiri; Manager boleh semua cabang", func(t *testing.T) {
		galat(t, ubah(sari, "BK-002", M{"cabang": 2, "jenis": "tambah", "jumlah": 1}), 403, "AKSES")
		sama(t, stok("BK-002"), []int{12, 8, 6})
		manager := ubah(rahmat, "BK-002", M{"cabang": 3, "jenis": "tambah", "jumlah": 4})
		sama(t, []any{manager.Status, teks(manager.Data, "riwayat", "staff")}, []any{200, "Rahmat Hidayat"})
		sama(t, stok("BK-002"), []int{12, 8, 10})
	})

	t.Run("buku tidak ada -> 404", func(t *testing.T) {
		galat(t, ubah(sari, "BK-999", M{"cabang": 1, "jenis": "tambah", "jumlah": 1}), 404, "TIDAK_ADA")
	})

	t.Run("dua orang mengurangi stok yang sama bersamaan: stok tetap tidak negatif", func(t *testing.T) {
		// stok 16, enam permintaan kurang 3 sekaligus: hanya 5 yang boleh berhasil
		var grup sync.WaitGroup
		status := make([]int, 6)
		for i := range status {
			grup.Add(1)
			go func() {
				defer grup.Done()
				status[i] = ubah(rahmat, "BK-013", M{"cabang": 1, "jenis": "kurang", "jumlah": 3}).Status
			}()
		}
		grup.Wait()
		berhasil, ditolak := 0, 0
		for _, s := range status {
			switch s {
			case 200:
				berhasil++
			case 422:
				ditolak++
			}
		}
		sama(t, []int{berhasil, ditolak}, []int{5, 1})
		sama(t, stok("BK-013"), []int{1, 13, 11})
		var baris []struct{ StokSesudah int }
		err := db.Raw(`SELECT r.stok_sesudah FROM riwayat_stok r JOIN stok s ON s.id = r.id_stok JOIN buku b ON b.id = s.id_buku
			WHERE b.kode = 'BK-013' AND s.id_cabang = 1 ORDER BY r.id DESC LIMIT 5`).Scan(&baris).Error
		if err != nil {
			t.Fatal(err)
		}
		var sesudah []int
		for _, x := range baris {
			sesudah = append(sesudah, x.StokSesudah)
		}
		sama(t, sesudah, []int{1, 4, 7, 10, 13}, "riwayat berurutan tanpa lompatan")
	})

	t.Run("batalkan: stok kembali dan catatannya hilang", func(t *testing.T) {
		r := ubah(sari, "BK-009", M{"cabang": 1, "jenis": "kurang", "jumlah": 4})
		sama(t, stok("BK-009"), []int{6, 4, 8})
		id := angka(r.Data, "riwayat", "id")
		batal := batalkan(sari, id)
		sama(t, []any{batal.Status, ambil(batal.Data, "stok")}, []any{200, []int{10, 4, 8}})
		galat(t, batalkan(sari, id), 404, "TIDAK_ADA")
		galat(t, u.minta("DELETE", "/api/riwayat/abc", opsi{Kue: sari}), 404, "TIDAK_ADA")
	})

	t.Run("batalkan ditolak: bukan pelakunya (403), sudah ada perubahan lain (409), sudah terlalu lama (409)", func(t *testing.T) {
		a := ubah(dimas, "BK-009", M{"cabang": 2, "jenis": "tambah", "jumlah": 1})
		idA := angka(a.Data, "riwayat", "id")
		galat(t, batalkan(sari, idA), 403, "AKSES")

		ubah(dimas, "BK-009", M{"cabang": 2, "jenis": "tambah", "jumlah": 1})
		galat(t, batalkan(dimas, idA), 409, "KONFLIK")

		// riwayat data contoh sudah lewat 10 menit
		lama := hitung(t, `SELECT r.id FROM riwayat_stok r
			WHERE r.id = (SELECT MAX(x.id) FROM riwayat_stok x WHERE x.id_stok = r.id_stok)
			  AND r.tanggal < now() - interval '15 minutes' LIMIT 1`)
		galat(t, batalkan(rahmat, lama), 409, "KONFLIK")

		b := ubah(dimas, "BK-010", M{"cabang": 2, "jenis": "tambah", "jumlah": 2})
		sama(t, batalkan(rahmat, angka(b.Data, "riwayat", "id")).Status, 200, "Manager boleh membatalkan perubahan Staff")
	})

	t.Run("tambah judul baru: buku muncul di katalog, stok awal tercatat sebagai 'judul_baru'", func(t *testing.T) {
		data := M{"kode": "bk-100", "kategori": "novel", "judul": "Buku Uji", "pengarang": "Penulis Uji", "penerbit": "Penerbit Uji",
			"harga": "75000", "tahun": "2026", "stokAwal": "8", "min": "3", "cabang": 1, "sampul": nil}
		r := u.minta("POST", "/api/buku", opsi{Kue: sari, Body: data})
		sama(t, r.Status, 201)
		sama(t, ambil(r.Data, "buku"), M{
			"kode": "BK-100", "judul": "Buku Uji", "pengarang": "Penulis Uji", "penerbit": "Penerbit Uji",
			"kategori": "Novel", "tahun": 2026, "harga": 75000, "min": 3, "sampul": nil, "stok": []int{8, 0, 0},
		})
		rw := ambil(r.Data, "riwayat")
		sama(t, []any{teks(rw, "jenis"), angka(rw, "jumlah"), angka(rw, "sebelum"), angka(rw, "sesudah"), teks(rw, "keterangan"), teks(rw, "staff"), angka(rw, "cabang")},
			[]any{"judul_baru", 8, 0, 8, "Stok awal judul baru", "Sari Wulandari", 1})
		sama(t, jumlahBuku(), 26)
		sama(t, len(daftar(u.minta("GET", "/api/kategori").Data)), 8, "'novel' memakai kategori 'Novel' yang sudah ada")

		data["kode"] = "BK-100"
		galat(t, u.minta("POST", "/api/buku", opsi{Kue: sari, Body: data}), 422, "VALIDASI", "kode")

		data["kode"], data["kategori"] = "BK-101", "Komik"
		sama(t, u.minta("POST", "/api/buku", opsi{Kue: sari, Body: data}).Status, 201)
		sama(t, len(daftar(u.minta("GET", "/api/kategori").Data)), 9, "kategori baru dibuat otomatis")
	})

	t.Run("tambah judul baru: isian salah, kode terlarang, dan cabang orang lain ditolak", func(t *testing.T) {
		dengan := func(nama string, nilai any) M {
			d := M{"kode": "BK-200", "kategori": "Komik", "judul": "J", "pengarang": "P", "penerbit": "T", "harga": 1000, "tahun": 2020, "stokAwal": 0, "min": 0, "cabang": 1}
			d[nama] = nilai
			return d
		}
		kasus := []struct {
			nama  string
			nilai any
		}{
			{"kode", ""}, {"kode", "A!"}, {"kode", "terlaris"}, {"kategori", " "}, {"judul", ""}, {"pengarang", ""}, {"penerbit", ""},
			{"harga", 0}, {"harga", "gratis"}, {"tahun", 1800}, {"stokAwal", -1}, {"stokAwal", 1.5}, {"min", -1}, {"cabang", 5},
			{"sampul", "https://contoh.com/gambar.jpg"},
		}
		sebelum := jumlahBuku()
		for _, k := range kasus {
			galat(t, u.minta("POST", "/api/buku", opsi{Kue: rahmat, Body: dengan(k.nama, k.nilai)}), 422, "VALIDASI", k.nama)
		}
		galat(t, u.minta("POST", "/api/buku", opsi{Kue: sari, Body: dengan("cabang", 2)}), 403, "AKSES")
		sama(t, jumlahBuku(), sebelum, "tidak ada buku yang ikut tersimpan")
	})

	t.Run("gambar sampul berbentuk data URL ikut tersimpan", func(t *testing.T) {
		gambar := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString([]byte{0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9})
		r := u.minta("POST", "/api/buku", opsi{Kue: rahmat, Body: M{
			"kode": "BK-300", "kategori": "Komik", "judul": "Bergambar", "pengarang": "P", "penerbit": "T", "harga": 1000,
			"tahun": 2020, "stokAwal": 1, "min": 0, "cabang": 3, "sampul": gambar,
		}})
		sama(t, []any{r.Status, teks(r.Data, "buku", "sampul")}, []any{201, gambar})
		sama(t, teks(u.minta("GET", "/api/buku/BK-300").Data, "sampul"), gambar)
	})

	t.Run("batalkan judul baru: bukunya hilang; ditolak kalau stoknya sudah diubah di cabang lain", func(t *testing.T) {
		judul := func(kode string) jawaban {
			return u.minta("POST", "/api/buku", opsi{Kue: sari, Body: M{"kode": kode, "kategori": "Komik", "judul": "Sementara",
				"pengarang": "P", "penerbit": "T", "harga": 1000, "tahun": 2020, "stokAwal": 2, "min": 0, "cabang": 1}})
		}
		a := judul("BK-400")
		batal := batalkan(sari, angka(a.Data, "riwayat", "id"))
		sama(t, []any{batal.Status, batal.Data}, []any{200, nil})
		sama(t, u.minta("GET", "/api/buku/BK-400").Status, 404)
		sama(t, hitung(t, "SELECT COUNT(*) FROM stok s JOIN buku b ON b.id = s.id_buku WHERE b.kode = 'BK-400'"), 0)

		b := judul("BK-401")
		ubah(dimas, "BK-401", M{"cabang": 2, "jenis": "tambah", "jumlah": 3})
		galat(t, batalkan(sari, angka(b.Data, "riwayat", "id")), 409, "KONFLIK")
		sama(t, stok("BK-401"), []int{2, 3, 0})
	})
}
