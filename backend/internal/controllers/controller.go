// Package controllers berisi handler HTTP (Controller dalam MVC).
// Setiap fungsi mewakili satu endpoint; daftar lengkapnya ada di frontend/BACKEND-INTEGRATION.md.
package controllers

import (
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/config"
)

type Controller struct {
	DB     *gorm.DB
	Config config.Config
}

func Baru(db *gorm.DB, cfg config.Config) *Controller {
	return &Controller{DB: db, Config: cfg}
}
