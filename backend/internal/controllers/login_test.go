package controllers_test

import (
	"fmt"
	"strings"
	"testing"
)

func TestLoginDanRole(t *testing.T) {
	u := siapkan(t)
	login := func(username, password string) jawaban {
		return u.minta("POST", "/api/auth/login", opsi{Body: map[string]any{"username": username, "password": password}})
	}

	t.Run("login benar mengembalikan data akun dan cookie sesi httpOnly", func(t *testing.T) {
		r := login("sari", sandi)
		sama(t, r.Status, 200)
		sama(t, r.Data, map[string]any{"id": 1, "username": "sari", "nama": "Sari Wulandari", "role": "staff", "idCabang": 1})
		kue := r.Kepala.Get("Set-Cookie")
		benar(t, strings.Contains(kue, "zanafa_sesi=") && strings.Contains(kue, "HttpOnly") && strings.Contains(kue, "SameSite=Lax"), kue)
		benar(t, !strings.Contains(string(r.Mentah), "password"))
	})

	t.Run("username tidak peka huruf besar/kecil dan spasi", func(t *testing.T) {
		r := login("  RAHMAT ", sandi)
		sama(t, []any{r.Status, teks(r.Data, "role"), ambil(r.Data, "idCabang")}, []any{200, "manager", nil})
	})

	t.Run("password salah -> 401 KREDENSIAL, tanpa membocorkan apakah username ada", func(t *testing.T) {
		a, b := login("sari", "salah"), login("tidak-ada", "salah")
		galat(t, a, 401, "KREDENSIAL")
		galat(t, b, 401, "KREDENSIAL")
		sama(t, teks(a.Data, "pesan"), teks(b.Data, "pesan"))
	})

	t.Run("isian kosong atau body rusak -> 422 VALIDASI", func(t *testing.T) {
		galat(t, login("", ""), 422, "VALIDASI", "username")
		galat(t, login("sari", ""), 422, "VALIDASI", "username")
		galat(t, u.minta("POST", "/api/auth/login", opsi{Teks: "{rusak"}), 422, "VALIDASI", "username")
	})

	t.Run("GET /api/auth/saya: tanpa sesi 401 SESI, dengan cookie 200", func(t *testing.T) {
		galat(t, u.minta("GET", "/api/auth/saya"), 401, "SESI")
		sama(t, u.minta("GET", "/api/auth/saya", opsi{Kue: u.masuk("dimas")}).Data,
			map[string]any{"id": 2, "username": "dimas", "nama": "Dimas Pratama", "role": "staff", "idCabang": 2})
	})

	t.Run("cookie yang diubah-ubah ditolak; yang disimpan di database hanya hash token", func(t *testing.T) {
		kue := u.masuk("sari")
		galat(t, u.minta("GET", "/api/auth/saya", opsi{Kue: kue + "x"}), 401, "SESI")
		token := strings.TrimPrefix(kue, "zanafa_sesi=")
		sama(t, hitung(t, "SELECT COUNT(*) FROM sesi WHERE token_hash = ?", token), 0)
	})

	t.Run("akun yang dinonaktifkan langsung kehilangan akses", func(t *testing.T) {
		kue := u.masuk("nurul")
		db.Exec("UPDATE pengguna SET status = FALSE WHERE username = 'nurul'")
		defer db.Exec("UPDATE pengguna SET status = TRUE WHERE username = 'nurul'")
		galat(t, u.minta("GET", "/api/auth/saya", opsi{Kue: kue}), 401, "SESI")
		galat(t, login("nurul", sandi), 401, "KREDENSIAL")
	})

	t.Run("logout menghapus sesi di server dan cookie di browser", func(t *testing.T) {
		kue := u.masuk("sari")
		r := u.minta("POST", "/api/auth/logout", opsi{Kue: kue})
		sama(t, r.Status, 200)
		keluar := r.Kepala.Get("Set-Cookie")
		benar(t, strings.Contains(keluar, "zanafa_sesi=;") && strings.Contains(keluar, "Max-Age=0"), keluar)
		galat(t, u.minta("GET", "/api/auth/saya", opsi{Kue: kue}), 401, "SESI")
		sama(t, u.minta("POST", "/api/auth/logout").Status, 200, "logout tanpa sesi tetap berhasil")
	})

	t.Run("password disimpan sebagai hash, bukan teks asli", func(t *testing.T) {
		var hash []string
		if err := db.Table("pengguna").Pluck("password_hash", &hash).Error; err != nil {
			t.Fatal(err)
		}
		sama(t, len(hash), 4)
		for _, h := range hash {
			benar(t, strings.HasPrefix(h, "$2") && !strings.Contains(h, sandi), h)
		}
	})

	t.Run("GET /api/pengguna hanya untuk Manager", func(t *testing.T) {
		galat(t, u.minta("GET", "/api/pengguna"), 401, "SESI")
		galat(t, u.minta("GET", "/api/pengguna", opsi{Kue: u.masuk("sari")}), 403, "AKSES")
		r := u.minta("GET", "/api/pengguna", opsi{Kue: u.masuk("rahmat")})
		sama(t, []any{r.Status, len(daftar(r.Data))}, []any{200, 4})
		sama(t, ambil(r.Data, 0), map[string]any{"id": 1, "nama": "Sari Wulandari", "role": "staff", "idCabang": 1})
		sama(t, ambil(r.Data, 3, "idCabang"), nil)
		benar(t, !strings.Contains(string(r.Mentah), "password"))
	})

	t.Run("lima kali password salah -> ditahan sementara (429), akun lain tidak ikut tertahan", func(t *testing.T) {
		for i := 0; i < 5; i++ {
			galat(t, login("dimas", fmt.Sprint("tebakan", i)), 401, "KREDENSIAL")
		}
		galat(t, login("dimas", "tebakan lagi"), 429, "TERLALU_SERING")
		sama(t, login("dimas", sandi).Status, 429, "password benar pun ditahan")
		sama(t, login("nurul", sandi).Status, 200)
	})

	t.Run("login berhasil menghapus hitungan salah sebelumnya", func(t *testing.T) {
		for i := 0; i < 4; i++ {
			login("nurul", "salah")
		}
		sama(t, login("nurul", sandi).Status, 200)
		for i := 0; i < 4; i++ {
			login("nurul", "salah")
		}
		sama(t, login("nurul", sandi).Status, 200)
	})

	t.Run("pencegah CSRF: permintaan yang mengubah data harus JSON atau membawa X-Requested-With", func(t *testing.T) {
		form := u.minta("POST", "/api/auth/login", opsi{Teks: "username=sari&password=" + sandi, Polos: true, JenisIsi: "application/x-www-form-urlencoded"})
		sama(t, form.Status, 415)
		sama(t, u.minta("POST", "/api/auth/logout", opsi{Polos: true}).Status, 400)
	})

	t.Run("alamat API yang tidak ada dijawab dalam bentuk { kode, pesan }", func(t *testing.T) {
		galat(t, u.minta("GET", "/api/tidak-ada"), 404, "TIDAK_ADA")
		galat(t, u.minta("DELETE", "/api/buku"), 404, "TIDAK_ADA")
	})
}
