// Titik masuk server API Zanafa Pulse.
//
//	go run ./cmd/server
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/config"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/controllers"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/database"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/notifikasi"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/routes"
)

func main() {
	cfg, err := config.Muat()
	if err != nil {
		log.Fatal(err)
	}
	if cfg.MigrasiOtomatis {
		if err := database.Migrasi(cfg.DatabaseURL); err != nil {
			log.Fatal(err)
		}
		log.Println("migrasi database selesai")
	}
	db, err := database.Buka(cfg.DatabaseURL, cfg.Produksi())
	if err != nil {
		log.Fatal(err)
	}

	if cfg.Produksi() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	// Di belakang NGINX: percayai header X-Forwarded-For hanya dari jaringan lokal/Docker.
	if err := r.SetTrustedProxies([]string{"127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}); err != nil {
		log.Fatal(err)
	}
	routes.Pasang(r, controllers.Baru(db, cfg))

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
	}

	// Matikan server dengan rapi saat menerima Ctrl+C atau sinyal stop dari Docker.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	// Email stok menipis yang gagal terkirim dicoba ulang berkala.
	go notifikasi.KirimUlangBerkala(ctx, db)
	go func() {
		log.Printf("server berjalan di http://localhost:%s (lingkungan: %s)", cfg.Port, cfg.Lingkungan)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	log.Println("mematikan server...")
	ctxMati, batal := context.WithTimeout(context.Background(), 10*time.Second)
	defer batal()
	if err := srv.Shutdown(ctxMati); err != nil {
		log.Printf("gagal mematikan dengan rapi: %v", err)
	}
}
