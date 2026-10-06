package controllers_test

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/notifikasi"
)

func TestPeringatanStokMenipis(t *testing.T) {
	u := siapkan(t)
	sari, rahmat := u.masuk("sari"), u.masuk("rahmat")
	type M = map[string]any
	ubah := func(kue, kode string, body M) jawaban {
		r := u.minta("POST", "/api/stok/"+kode+"/perubahan", opsi{Kue: kue, Body: body})
		notifikasi.Tunggu() // email dikirim di latar: tunggu sampai selesai
		return r
	}
	dikirimKe := func(s surat, alamat string) bool { return strings.Contains(strings.Join(s.Kepada, " "), alamat) }
	statusNotifikasi := func(id int) (terkirim bool, percobaan int, adaGalat bool) {
		var baris []struct {
			StatusKirim bool
			Percobaan   int
			AdaGalat    bool
		}
		err := db.Raw("SELECT status_kirim, percobaan, galat_terakhir IS NOT NULL AS ada_galat FROM notifikasi WHERE id = ?", id).Scan(&baris).Error
		if err != nil || len(baris) != 1 {
			t.Fatalf("notifikasi #%d tidak terbaca: %v", id, err)
		}
		return baris[0].StatusKirim, baris[0].Percobaan, baris[0].AdaGalat
	}
	semuaBuku := func() []any { return daftar(u.minta("GET", "/api/buku?per=100").Data, "items") }

	t.Run("stok TEPAT di batas minimum belum menipis (aturannya <, bukan <=): tidak ada notifikasi, tidak ada email", func(t *testing.T) {
		// BK-002 Cabang 1: stok 12, minimum 5 -> dikurangi 7 jadi tepat 5
		r := ubah(sari, "BK-002", M{"cabang": 1, "jenis": "kurang", "jumlah": 7})
		sama(t, []any{angka(r.Data, "riwayat", "sesudah"), ambil(r.Data, "notifikasi"), len(smtp.semua())}, []any{5, nil, 0})
	})

	t.Run("stok turun di bawah minimum: notifikasi dibuat dan email terkirim berisi judul, cabang, sisa stok", func(t *testing.T) {
		r := ubah(sari, "BK-002", M{"cabang": 1, "jenis": "kurang", "jumlah": 1, "keterangan": "Terjual"})
		sama(t, r.Status, 200)
		n := ambil(r.Data, "notifikasi").(map[string]any)
		sama(t, []any{teks(n, "pesan"), len(n)}, []any{"Stok Bumi Manusia di Cabang 1 tinggal 4 (batas minimum 5).", 4})

		semua := smtp.semua()
		sama(t, len(semua), 1)
		benar(t, dikirimKe(semua[0], "owner@uji.local"), "dikirim ke Owner")
		for _, potongan := range []string{"Stok menipis", "Bumi Manusia (BK-002)", "Cabang 1", "Sisa stok: 4 eksemplar", "Minimum  : 5 eksemplar", "Sari Wulandari", "http://uji.local/#/stok/BK-002"} {
			benar(t, strings.Contains(semua[0].Isi, potongan), "isi email memuat: ", potongan, "\n", semua[0].Isi)
		}
		terkirim, percobaan, _ := statusNotifikasi(angka(n, "id"))
		sama(t, []any{terkirim, percobaan}, []any{true, 1})
	})

	t.Run("EMAIL_OWNER boleh berisi beberapa alamat; yang salah ketik dilewati", func(t *testing.T) {
		os.Setenv("EMAIL_OWNER", "owner@uji.local, Kedua <dua@uji.local>, salah-ketik, OWNER@uji.local")
		defer os.Setenv("EMAIL_OWNER", "owner@uji.local")
		sama(t, notifikasi.Penerima(), []string{"owner@uji.local", "dua@uji.local"})
		ubah(sari, "BK-002", M{"cabang": 1, "jenis": "kurang", "jumlah": 1})
		semua := smtp.semua()
		terakhir := semua[len(semua)-1]
		benar(t, dikirimKe(terakhir, "owner@uji.local") && dikirimKe(terakhir, "dua@uji.local") && len(terakhir.Kepada) == 2, terakhir.Kepada)
	})

	idGagal := 0
	t.Run("email gagal: perubahan stok TETAP tersimpan, notifikasi berstatus belum terkirim", func(t *testing.T) {
		smtp.matikan()                                                             // server email mati
		r := ubah(sari, "BK-005", M{"cabang": 1, "jenis": "kurang", "jumlah": 12}) // 14 -> 2, minimum 4
		sama(t, []any{r.Status, angka(r.Data, "riwayat", "sesudah")}, []any{200, 2})
		idGagal = angka(r.Data, "notifikasi", "id")
		sama(t, ambil(u.minta("GET", "/api/buku/BK-005").Data, "stok"), []int{2, 12, 9})
		terkirim, percobaan, adaGalat := statusNotifikasi(idGagal)
		sama(t, []any{terkirim, percobaan, adaGalat}, []any{false, 1, true})
	})

	t.Run("email yang gagal dicoba ulang dan berhasil setelah server email hidup lagi", func(t *testing.T) {
		if err := smtp.hidupkan(); err != nil {
			t.Fatal(err)
		}
		awal := len(smtp.semua())
		dicoba, berhasil := notifikasi.KirimUlang(ctx, db)
		sama(t, []int{dicoba, berhasil}, []int{1, 1}, "notifikasi gagal dari data contoh tidak ikut dicoba")
		sama(t, len(smtp.semua()), awal+1)
		terkirim, percobaan, adaGalat := statusNotifikasi(idGagal)
		sama(t, []any{terkirim, percobaan, adaGalat}, []any{true, 2, false})
		dicoba, berhasil = notifikasi.KirimUlang(ctx, db)
		sama(t, []int{dicoba, berhasil}, []int{0, 0})
	})

	t.Run("SMTP belum diatur: notifikasi tetap tercatat, tidak dihitung sebagai percobaan", func(t *testing.T) {
		host := os.Getenv("SMTP_HOST")
		os.Setenv("SMTP_HOST", "")
		defer os.Setenv("SMTP_HOST", host)
		r := ubah(sari, "BK-021", M{"cabang": 1, "jenis": "kurang", "jumlah": 7}) // 10 -> 3, minimum 4
		terkirim, percobaan, adaGalat := statusNotifikasi(angka(r.Data, "notifikasi", "id"))
		sama(t, []any{r.Status, terkirim, percobaan, adaGalat}, []any{200, false, 0, false})
	})

	t.Run("membatalkan perubahan ikut menghapus notifikasinya", func(t *testing.T) {
		r := ubah(sari, "BK-021", M{"cabang": 1, "jenis": "kurang", "jumlah": 1}) // 3 -> 2
		id := angka(r.Data, "notifikasi", "id")
		sama(t, u.minta("DELETE", fmt.Sprint("/api/riwayat/", angka(r.Data, "riwayat", "id")), opsi{Kue: sari}).Status, 200)
		sama(t, hitung(t, "SELECT COUNT(*) FROM notifikasi WHERE id = ?", id), 0)
	})

	t.Run("dashboard Staff: cabang diambil dari akun; Manager diarahkan ke dashboardnya sendiri", func(t *testing.T) {
		galat(t, u.minta("GET", "/api/dashboard/staff"), 401, "SESI")
		galat(t, u.minta("GET", "/api/dashboard/staff", opsi{Kue: rahmat}), 403, "AKSES")

		r := u.minta("GET", "/api/dashboard/staff?cabang=3", opsi{Kue: sari}) // ?cabang= diabaikan
		sama(t, r.Status, 200)
		d := r.Data
		sama(t, []any{angka(d, "cabang"), angka(d, "totalJudul"), len(daftar(d, "tren"))}, []any{1, 25, 14})
		benar(t, len(daftar(d, "terlaris")) == 5 && angka(d, "terlaris", 0, "terjual") > 0)
		var stokSini []int
		adaBK002 := false
		for _, b := range daftar(d, "menipis") {
			benar(t, angka(b, "stok", 0) < angka(b, "min"), "semua yang tampil memang menipis di Cabang 1")
			stokSini = append(stokSini, angka(b, "stok", 0))
			adaBK002 = adaBK002 || teks(b, "kode") == "BK-002"
		}
		benar(t, adaBK002 && sort.IntsAreSorted(stokSini), "BK-002 ada, dan yang paling sedikit di atas")

		tersedia, eksemplar, menipis := 0, 0, 0
		for _, b := range semuaBuku() {
			n := angka(b, "stok", 0)
			eksemplar += n
			if n > 0 {
				tersedia++
			}
			if n < angka(b, "min") {
				menipis++
			}
		}
		sama(t, []any{angka(d, "judulTersedia"), angka(d, "eksemplar"), len(daftar(d, "menipis"))}, []any{tersedia, eksemplar, menipis})
		sama(t, angka(d, "terjual30"), hitung(t, `SELECT COALESCE(SUM(ABS(r.jumlah)), 0) FROM riwayat_stok r JOIN stok s ON s.id = r.id_stok
			WHERE r.jenis = 'kurang' AND s.id_cabang = 1 AND r.tanggal >= now() - interval '30 days'`))
	})

	t.Run("dashboard Manager: hanya Manager; tiga cabang, aktivitas terbaru, stok menipis + status email", func(t *testing.T) {
		galat(t, u.minta("GET", "/api/dashboard/manager", opsi{Kue: sari}), 403, "AKSES")
		ubah(sari, "BK-007", M{"cabang": 1, "jenis": "tambah", "jumlah": 1, "keterangan": "paling baru"})
		r := u.minta("GET", "/api/dashboard/manager", opsi{Kue: rahmat})
		sama(t, r.Status, 200)
		d := r.Data
		sama(t, []any{angka(d, "totalJudul"), kolom(daftar(d, "perCabang"), "cabang")}, []any{25, []int{1, 2, 3}})

		buku := semuaBuku()
		jumlahMenipis := 0
		for i, p := range daftar(d, "perCabang") {
			tersedia, eksemplar, menipis, kosong := 0, 0, 0, 0
			for _, b := range buku {
				n := angka(b, "stok", i)
				eksemplar += n
				if n > 0 {
					tersedia++
				}
				if n < angka(b, "min") {
					menipis++
				}
				if n == 0 {
					kosong++
				}
			}
			sama(t, []any{angka(p, "judulTersedia"), angka(p, "eksemplar"), angka(p, "menipis"), angka(p, "kosong"), len(daftar(p, "tren"))},
				[]any{tersedia, eksemplar, menipis, kosong, 14}, "cabang ", i+1)
			jumlahTren := 0
			for _, n := range daftar(p, "tren") {
				jumlahTren += int(n.(float64))
			}
			benar(t, angka(p, "terjual30") >= jumlahTren && jumlahTren > 0)
			jumlahMenipis += menipis
		}

		sama(t, []any{len(daftar(d, "aktivitas")), len(ambil(d, "aktivitas", 0).(map[string]any))}, []any{7, 12})
		sama(t, []any{teks(d, "aktivitas", 0, "kode"), teks(d, "aktivitas", 0, "keterangan")}, []any{"BK-007", "paling baru"}, "perubahan paling baru di atas")

		sama(t, len(daftar(d, "menipis")), jumlahMenipis)
		var stokUrut []int
		ketemu := false
		for _, m := range daftar(d, "menipis") {
			stokUrut = append(stokUrut, angka(m, "stok"))
			if teks(m, "kode") == "BK-002" && angka(m, "cabang") == 1 {
				ketemu = true
				sama(t, []any{angka(m, "stok"), angka(m, "min"), ambil(m, "notifikasi", "statusKirim")}, []any{3, 5, true})
			}
			if teks(m, "kode") == "BK-011" && angka(m, "cabang") == 2 {
				sama(t, ambil(m, "notifikasi", "statusKirim"), false, "contoh email gagal dari data awal")
			}
		}
		benar(t, ketemu && sort.IntsAreSorted(stokUrut))
	})
}
