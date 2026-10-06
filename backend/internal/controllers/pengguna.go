package controllers

import (
	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

type stafJSON struct {
	ID       int    `json:"id"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	IDCabang *int   `json:"idCabang"`
}

// DaftarPengguna mengisi pilihan "Nama staff" di halaman Riwayat. Khusus Manager.
// GET /api/pengguna
func (h *Controller) DaftarPengguna(c *gin.Context) {
	var daftar []models.Pengguna
	if err := h.DB.WithContext(c).Order("id").Find(&daftar).Error; err != nil {
		respon.Server(c, err)
		return
	}
	hasil := make([]stafJSON, len(daftar))
	for i, p := range daftar {
		hasil[i] = stafJSON{ID: p.ID, Nama: p.Nama, Role: p.Role, IDCabang: p.IDCabang}
	}
	respon.OK(c, hasil)
}
