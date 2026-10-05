// Package respon menyeragamkan bentuk JSON yang dikirim ke frontend.
// Bentuk galat cocok dengan ApiError di frontend/js/api.js: { kode, pesan, field }.
package respon

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
)

type Galat struct {
	Kode  string `json:"kode"`
	Pesan string `json:"pesan"`
	Field string `json:"field,omitempty"`
}

func OK(c *gin.Context, data any) { c.JSON(http.StatusOK, data) }

func Dibuat(c *gin.Context, data any) { c.JSON(http.StatusCreated, data) }

func gagal(c *gin.Context, status int, g Galat) { c.AbortWithStatusJSON(status, g) }

func Sesi(c *gin.Context) {
	gagal(c, http.StatusUnauthorized, Galat{Kode: "SESI", Pesan: "Sesi berakhir. Silakan masuk lagi."})
}

func Kredensial(c *gin.Context) {
	gagal(c, http.StatusUnauthorized, Galat{Kode: "KREDENSIAL", Pesan: "Username atau password salah. Periksa lagi, lalu coba masuk."})
}

func Akses(c *gin.Context, pesan string) {
	gagal(c, http.StatusForbidden, Galat{Kode: "AKSES", Pesan: pesan})
}

func TidakAda(c *gin.Context, pesan string) {
	gagal(c, http.StatusNotFound, Galat{Kode: "TIDAK_ADA", Pesan: pesan})
}

func Konflik(c *gin.Context, pesan string) {
	gagal(c, http.StatusConflict, Galat{Kode: "KONFLIK", Pesan: pesan})
}

func Validasi(c *gin.Context, field, pesan string) {
	gagal(c, http.StatusUnprocessableEntity, Galat{Kode: "VALIDASI", Pesan: pesan, Field: field})
}

func BelumDibuat(c *gin.Context, petunjuk string) {
	gagal(c, http.StatusNotImplemented, Galat{Kode: "BELUM_DIBUAT", Pesan: "Endpoint ini belum dibuat. " + petunjuk})
}

// Server mencatat galat asli ke log, tapi pengguna hanya melihat pesan umum.
func Server(c *gin.Context, err error) {
	log.Printf("galat server %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	gagal(c, http.StatusInternalServerError, Galat{Kode: "SERVER", Pesan: "Terjadi kesalahan di server. Coba lagi sebentar."})
}

// Dari menerjemahkan ErrValidasi menjadi respons 422; galat lain jadi 500.
func Dari(c *gin.Context, err error) {
	var ev models.ErrValidasi
	if errors.As(err, &ev) {
		Validasi(c, ev.Field, ev.Pesan)
		return
	}
	Server(c, err)
}
