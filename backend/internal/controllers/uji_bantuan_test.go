package controllers_test

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/config"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/controllers"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/database"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/notifikasi"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/routes"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/seed"
)

// Pengujian API dari ujung ke ujung: permintaan HTTP sungguhan ke aplikasi dengan database sungguhan.
//
// Butuh database PostgreSQL KOSONG khusus pengujian, karena isinya dihapus tiap kelompok test:
//
//	DATABASE_URL_UJI=postgres://zanafa:password@localhost:5432/zanafa_uji?sslmode=disable go test ./...
//
// Tanpa DATABASE_URL_UJI semua test di folder ini dilewati (go test ./... tetap lulus).
// Email tidak dikirim ke mana pun: ditangkap server SMTP tiruan di file ini.

const sandi = seed.PasswordContoh

var (
	db   *gorm.DB
	smtp *smtpTiruan
	ctx  = context.Background()
)

func TestMain(m *testing.M) {
	gagal := func(err error) {
		fmt.Fprintln(os.Stderr, "persiapan pengujian gagal:", err)
		os.Exit(1)
	}
	alamat := os.Getenv("DATABASE_URL_UJI")
	if alamat == "" {
		fmt.Println("pengujian API dilewati: DATABASE_URL_UJI belum diisi")
		os.Exit(m.Run())
	}
	if alamat == os.Getenv("DATABASE_URL") {
		gagal(fmt.Errorf("DATABASE_URL_UJI tidak boleh sama dengan DATABASE_URL: isi database uji dihapus"))
	}

	smtp = &smtpTiruan{}
	if err := smtp.hidupkan(); err != nil {
		gagal(err)
	}
	for nama, nilai := range map[string]string{
		"SMTP_HOST": "127.0.0.1", "SMTP_PORT": strconv.Itoa(smtp.port), "SMTP_SECURE": "false", "SMTP_USER": "",
		"EMAIL_OWNER": "owner@uji.local", "APP_URL": "http://uji.local",
	} {
		os.Setenv(nama, nilai)
	}

	gin.SetMode(gin.TestMode)
	if err := database.Migrasi(alamat); err != nil {
		gagal(err)
	}
	var err error
	if db, err = database.Buka(alamat, true); err != nil {
		gagal(err)
	}
	kode := m.Run()
	smtp.matikan()
	os.Exit(kode)
}

type uji struct {
	t      *testing.T
	alamat string
}

// siapkan mengosongkan database uji, mengisi data contoh, lalu menjalankan aplikasi di alamat sementara.
func siapkan(t *testing.T) *uji {
	t.Helper()
	if db == nil {
		t.Skip("butuh DATABASE_URL_UJI")
	}
	notifikasi.Tunggu()
	err := db.Exec("TRUNCATE notifikasi, laporan, sesi, riwayat_stok, stok, buku, pengguna, kategori, cabang RESTART IDENTITY CASCADE").Error
	if err != nil {
		t.Fatalf("mengosongkan database uji: %v", err)
	}
	if err := seed.Jalankan(db); err != nil {
		t.Fatalf("mengisi data contoh: %v", err)
	}
	smtp.kosongkan()
	middleware.KosongkanCatatanLogin()

	r := gin.New()
	r.Use(gin.Recovery())
	routes.Pasang(r, controllers.Baru(db, config.Config{Lingkungan: "test", LamaSesi: 12 * time.Hour}))
	server := httptest.NewServer(r)
	t.Cleanup(server.Close)
	return &uji{t: t, alamat: server.URL}
}

type jawaban struct {
	Status int
	Data   any
	Kepala http.Header
	Mentah []byte
}

type opsi struct {
	Kue      string // isi header Cookie, hasil masuk()
	Body     any    // dikirim sebagai JSON
	Teks     string // dikirim apa adanya
	Polos    bool   // tanpa header X-Requested-With dan Content-Type
	JenisIsi string
}

func (u *uji) minta(metode, jalur string, o ...opsi) jawaban {
	u.t.Helper()
	var pilihan opsi
	if len(o) > 0 {
		pilihan = o[0]
	}
	var isi io.Reader
	if pilihan.Body != nil {
		b, _ := json.Marshal(pilihan.Body)
		isi = bytes.NewReader(b)
	} else if pilihan.Teks != "" {
		isi = strings.NewReader(pilihan.Teks)
	}
	req, err := http.NewRequest(metode, u.alamat+jalur, isi)
	if err != nil {
		u.t.Fatal(err)
	}
	if !pilihan.Polos {
		req.Header.Set("X-Requested-With", "uji")
		if isi != nil {
			req.Header.Set("Content-Type", "application/json")
		}
	}
	if pilihan.JenisIsi != "" {
		req.Header.Set("Content-Type", pilihan.JenisIsi)
	}
	if pilihan.Kue != "" {
		req.Header.Set("Cookie", pilihan.Kue)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		u.t.Fatal(err)
	}
	defer res.Body.Close()
	mentah, _ := io.ReadAll(res.Body)
	j := jawaban{Status: res.StatusCode, Kepala: res.Header, Mentah: mentah}
	_ = json.Unmarshal(mentah, &j.Data)
	return j
}

// masuk login lalu mengembalikan cookie sesinya ("zanafa_sesi=...").
func (u *uji) masuk(username string) string {
	u.t.Helper()
	r := u.minta("POST", "/api/auth/login", opsi{Body: map[string]any{"username": username, "password": sandi}})
	if r.Status != 200 {
		u.t.Fatalf("login %s gagal: %d %s", username, r.Status, r.Mentah)
	}
	return strings.SplitN(r.Kepala.Get("Set-Cookie"), ";", 2)[0]
}

// contoh: ambil(r.Data, "items", 0, "kode")
func ambil(v any, jalur ...any) any {
	for _, langkah := range jalur {
		switch k := langkah.(type) {
		case string:
			peta, _ := v.(map[string]any)
			v = peta[k]
		case int:
			daftar, _ := v.([]any)
			if k < 0 || k >= len(daftar) {
				return nil
			}
			v = daftar[k]
		}
	}
	return v
}

func teks(v any, jalur ...any) string { s, _ := ambil(v, jalur...).(string); return s }
func angka(v any, jalur ...any) int   { f, _ := ambil(v, jalur...).(float64); return int(f) }
func daftar(v any, jalur ...any) []any {
	d, _ := ambil(v, jalur...).([]any)
	return d
}

func kolom(d []any, nama string) []any {
	hasil := make([]any, len(d))
	for i, x := range d {
		hasil[i] = ambil(x, nama)
	}
	return hasil
}

// supaya 5 (int) dan 5 (float64) dianggap sama
func kanonik(v any) string {
	b, _ := json.Marshal(v)
	var umum any
	json.Unmarshal(b, &umum)
	b, _ = json.Marshal(umum)
	return string(b)
}

func sama(t *testing.T, dapat, harap any, ket ...any) {
	t.Helper()
	if a, b := kanonik(dapat), kanonik(harap); a != b {
		t.Fatalf("%s\n  dapat: %s\n  harap: %s", fmt.Sprint(ket...), a, b)
	}
}

func benar(t *testing.T, syarat bool, ket ...any) {
	t.Helper()
	if !syarat {
		t.Fatalf("seharusnya benar: %s", fmt.Sprint(ket...))
	}
}

func galat(t *testing.T, r jawaban, status int, kode string, field ...string) {
	t.Helper()
	harap := []any{status, kode}
	dapat := []any{r.Status, teks(r.Data, "kode")}
	if len(field) > 0 {
		harap = append(harap, field[0])
		dapat = append(dapat, teks(r.Data, "field"))
	}
	sama(t, dapat, harap, string(r.Mentah))
}

// hitung menjalankan query yang hasilnya satu angka.
func hitung(t *testing.T, sql string, arg ...any) int {
	t.Helper()
	var n int
	if err := db.Raw(sql, arg...).Row().Scan(&n); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
	return n
}

// waktu membaca teks waktu dari JSON.
func waktu(t *testing.T, v any, jalur ...any) time.Time {
	t.Helper()
	w, err := time.Parse(time.RFC3339Nano, teks(v, jalur...))
	if err != nil {
		t.Fatalf("waktu tidak terbaca: %v", err)
	}
	return w
}

// kodeSQL mengambil SQLSTATE dari galat PostgreSQL ("" kalau bukan galat database).
func kodeSQL(err error) string {
	var pg interface{ SQLState() string }
	if errors.As(err, &pg) {
		return pg.SQLState()
	}
	return ""
}

type surat struct {
	Kepada []string
	Isi    string
}

type smtpTiruan struct {
	kunci     sync.Mutex
	pesan     []surat
	pendengar net.Listener
	terbuka   map[net.Conn]bool
	port      int
}

func (s *smtpTiruan) hidupkan() error {
	p, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(s.port))
	if err != nil {
		return err
	}
	s.kunci.Lock()
	s.pendengar, s.terbuka = p, map[net.Conn]bool{}
	s.port = p.Addr().(*net.TCPAddr).Port
	s.kunci.Unlock()
	go func() {
		for {
			sambungan, err := p.Accept()
			if err != nil {
				return
			}
			s.kunci.Lock()
			s.terbuka[sambungan] = true
			s.kunci.Unlock()
			go s.layani(sambungan)
		}
	}()
	return nil
}

func (s *smtpTiruan) matikan() {
	s.kunci.Lock()
	defer s.kunci.Unlock()
	if s.pendengar != nil {
		s.pendengar.Close()
		s.pendengar = nil
	}
	for sambungan := range s.terbuka {
		sambungan.Close()
	}
}

func (s *smtpTiruan) kosongkan() {
	s.kunci.Lock()
	s.pesan = nil
	s.kunci.Unlock()
}

func (s *smtpTiruan) semua() []surat {
	s.kunci.Lock()
	defer s.kunci.Unlock()
	return append([]surat(nil), s.pesan...)
}

func (s *smtpTiruan) layani(sambungan net.Conn) {
	defer func() {
		sambungan.Close()
		s.kunci.Lock()
		delete(s.terbuka, sambungan)
		s.kunci.Unlock()
	}()
	pembaca := bufio.NewReader(sambungan)
	jawab := func(t string) { sambungan.Write([]byte(t + "\r\n")) }
	jawab("220 smtp-tiruan siap")
	var kini surat
	for {
		baris, err := pembaca.ReadString('\n')
		if err != nil {
			return
		}
		baris = strings.TrimRight(baris, "\r\n")
		perintah := strings.ToUpper(baris)
		switch {
		case strings.HasPrefix(perintah, "EHLO"), strings.HasPrefix(perintah, "HELO"):
			jawab("250 smtp-tiruan")
		case strings.HasPrefix(perintah, "MAIL"):
			jawab("250 ok")
		case strings.HasPrefix(perintah, "RCPT"):
			kini.Kepada = append(kini.Kepada, baris)
			jawab("250 ok")
		case strings.HasPrefix(perintah, "DATA"):
			jawab("354 kirim isi, akhiri dengan titik")
			var isi strings.Builder
			for {
				b, err := pembaca.ReadString('\n')
				if err != nil {
					return
				}
				if strings.TrimRight(b, "\r\n") == "." {
					break
				}
				isi.WriteString(b)
			}
			kini.Isi = isi.String()
			s.kunci.Lock()
			s.pesan = append(s.pesan, kini)
			s.kunci.Unlock()
			kini = surat{}
			jawab("250 diterima")
		case strings.HasPrefix(perintah, "QUIT"):
			jawab("221 sampai jumpa")
			return
		default:
			jawab("250 ok")
		}
	}
}
