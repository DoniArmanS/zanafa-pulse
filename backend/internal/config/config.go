// Package config membaca pengaturan dari environment variable.
// Untuk menjalankan lokal, salin .env.example menjadi .env lalu isi nilainya.
package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Lingkungan      string // "development" atau "production"
	Port            string
	DatabaseURL     string
	FrontendDir     string // jika diisi, server ikut menyajikan folder frontend (mode pengembangan)
	MigrasiOtomatis bool
	LamaSesi        time.Duration
}

func (c Config) Produksi() bool { return c.Lingkungan == "production" }

func Muat() (Config, error) {
	bacaFileEnv(".env")

	c := Config{
		Lingkungan:      ambil("APP_ENV", "development"),
		Port:            ambil("APP_PORT", "8081"),
		DatabaseURL:     ambil("DATABASE_URL", ""),
		FrontendDir:     ambil("FRONTEND_DIR", ""),
		MigrasiOtomatis: ambil("MIGRASI_OTOMATIS", "true") == "true",
	}
	lama, err := time.ParseDuration(ambil("LAMA_SESI", "12h"))
	if err != nil {
		return c, fmt.Errorf("LAMA_SESI tidak valid: %w", err)
	}
	c.LamaSesi = lama

	if c.DatabaseURL == "" {
		return c, fmt.Errorf("DATABASE_URL belum diisi (lihat .env.example)")
	}
	return c, nil
}

func ambil(kunci, bawaan string) string {
	if v, ok := os.LookupEnv(kunci); ok && v != "" {
		return v
	}
	return bawaan
}

// bacaFileEnv memuat KUNCI=NILAI dari file .env jika ada.
// Variabel yang sudah di-set di environment tidak ditimpa.
func bacaFileEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	s := bufio.NewScanner(f)
	for s.Scan() {
		baris := strings.TrimSpace(s.Text())
		if baris == "" || strings.HasPrefix(baris, "#") {
			continue
		}
		k, v, ok := strings.Cut(baris, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.Trim(strings.TrimSpace(v), `"'`)
		if _, ada := os.LookupEnv(k); !ada {
			os.Setenv(k, v)
		}
	}
}
