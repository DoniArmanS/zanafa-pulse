package middleware

import (
	"mime"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// HanyaJSON mewajibkan Content-Type application/json untuk permintaan yang mengubah data.
// Bersama cookie SameSite=Lax, ini mencegah CSRF: form dari situs lain tidak bisa mengirim JSON
// tanpa lolos pemeriksaan CORS browser.
func HanyaJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
			if c.Request.ContentLength != 0 {
				mt, _, _ := mime.ParseMediaType(c.GetHeader("Content-Type"))
				if mt != "application/json" {
					c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, respon.Galat{
						Kode: "VALIDASI", Pesan: "Kirim data dalam format JSON (Content-Type: application/json).",
					})
					return
				}
			} else if c.GetHeader("X-Requested-With") == "" && c.GetHeader("Content-Type") != "application/json" {
				// Permintaan tanpa isi (mis. logout, hapus) wajib menandai dirinya sebagai panggilan API.
				c.AbortWithStatusJSON(http.StatusBadRequest, respon.Galat{
					Kode: "VALIDASI", Pesan: "Permintaan harus dikirim dari aplikasi (header X-Requested-With).",
				})
				return
			}
		}
		c.Next()
	}
}

// HeaderKeamanan menambahkan header dasar untuk semua respons API.
func HeaderKeamanan() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("Cache-Control", "no-store")
		c.Next()
	}
}
