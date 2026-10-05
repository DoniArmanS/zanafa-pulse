// Package database membuka koneksi PostgreSQL (lewat GORM) dan menjalankan migrasi.
package database

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/DoniArmanS/zanafa-pulse/backend/migrations"
)

func Buka(databaseURL string, produksi bool) (*gorm.DB, error) {
	level := logger.Warn
	if !produksi {
		level = logger.Info
	}
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger:  logger.Default.LogMode(level),
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("membuka database: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database tidak bisa dihubungi: %w", err)
	}
	return db, nil
}

// Migrasi menjalankan semua file di folder migrations/ yang belum dijalankan.
func Migrasi(databaseURL string) error {
	sumber, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return err
	}
	// Driver pgx/v5 milik golang-migrate memakai skema URL "pgx5://".
	m, err := migrate.NewWithSourceInstance("iofs", sumber, ubahSkema(databaseURL, "pgx5"))
	if err != nil {
		return fmt.Errorf("menyiapkan migrasi: %w", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("menjalankan migrasi: %w", err)
	}
	return nil
}

func ubahSkema(url, skema string) string {
	for _, awalan := range []string{"postgres://", "postgresql://"} {
		if len(url) > len(awalan) && url[:len(awalan)] == awalan {
			return skema + "://" + url[len(awalan):]
		}
	}
	return url
}
