// Mengisi database dengan data contoh (25 buku, 3 cabang, 4 akun).
//
//	go run ./cmd/seed
package main

import (
	"log"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/config"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/database"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/seed"
)

func main() {
	cfg, err := config.Muat()
	if err != nil {
		log.Fatal(err)
	}
	if err := database.Migrasi(cfg.DatabaseURL); err != nil {
		log.Fatal(err)
	}
	db, err := database.Buka(cfg.DatabaseURL, true)
	if err != nil {
		log.Fatal(err)
	}
	if err := seed.Jalankan(db); err != nil {
		log.Fatal(err)
	}
}
