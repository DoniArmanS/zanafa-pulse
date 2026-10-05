// Package routes memetakan URL ke controller.
package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/controllers"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

func Pasang(r *gin.Engine, h *controllers.Controller) {
	api := r.Group("/api", middleware.HeaderKeamanan(), middleware.HanyaJSON(), middleware.BacaSesi(h.DB))

	// Publik (juga dipakai mode "Cek stok tanpa login")
	api.GET("/health", h.Health)
	api.POST("/auth/login", h.Login)
	api.POST("/auth/logout", h.Logout)
	api.GET("/kategori", h.Kategori)
	api.GET("/buku", h.DaftarBuku)
	api.GET("/buku/terlaris", h.Terlaris)
	api.GET("/buku/:kode", h.DetailBuku)

	// Wajib login (Staff atau Manager)
	login := api.Group("", middleware.WajibLogin())
	login.GET("/auth/saya", h.Saya)
	login.POST("/buku", h.TambahJudul)
	login.POST("/stok/:kode/perubahan", h.UbahStok)
	login.DELETE("/riwayat/:id", h.BatalkanPerubahan)
	login.GET("/riwayat", h.DaftarRiwayat)
	login.GET("/dashboard/staff", h.DashboardStaff)

	// Khusus Manager
	manager := api.Group("", middleware.WajibManager())
	manager.GET("/laporan/riwayat.csv", h.EksporRiwayat)
	manager.GET("/pengguna", h.DaftarPengguna)
	manager.GET("/dashboard/manager", h.DashboardManager)

	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			respon.TidakAda(c, "Alamat API tidak ditemukan.")
			return
		}
		sajikanFrontend(c, h.Config.FrontendDir)
	})
}

// sajikanFrontend dipakai saat pengembangan (FRONTEND_DIR diisi) agar frontend dan API
// berada di alamat yang sama tanpa NGINX. Di server produksi tugas ini dipegang NGINX.
func sajikanFrontend(c *gin.Context, dir string) {
	if dir == "" {
		c.Status(http.StatusNotFound)
		return
	}
	bersih := filepath.Clean("/" + c.Request.URL.Path)
	path := filepath.Join(dir, bersih)
	if info, err := os.Stat(path); err != nil || info.IsDir() {
		path = filepath.Join(dir, "index.html")
	}
	c.File(path)
}
