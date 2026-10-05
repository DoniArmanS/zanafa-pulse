// Package middleware berisi pemeriksaan yang dijalankan sebelum controller.
package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

const (
	NamaCookie    = "zanafa_sesi"
	kunciPengguna = "pengguna"
)

// BuatToken menghasilkan token acak untuk cookie dan hash-nya untuk disimpan di tabel sesi.
func BuatToken() (token, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(b)
	return token, HashToken(token), nil
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// PasangCookie mengirim cookie sesi: HttpOnly (tidak bisa dibaca JavaScript),
// SameSite=Lax, dan Secure saat produksi (HTTPS).
func PasangCookie(c *gin.Context, token string, lama time.Duration, produksi bool) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: NamaCookie, Value: token, Path: "/", MaxAge: int(lama.Seconds()),
		HttpOnly: true, Secure: produksi, SameSite: http.SameSiteLaxMode,
	})
}

func HapusCookie(c *gin.Context, produksi bool) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name: NamaCookie, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: produksi, SameSite: http.SameSiteLaxMode,
	})
}

// BacaSesi mengisi pengguna yang sedang login (jika ada) tanpa menolak permintaan.
func BacaSesi(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(NamaCookie)
		if err != nil || token == "" {
			c.Next()
			return
		}
		var p models.Pengguna
		err = db.WithContext(c).
			Joins("JOIN sesi s ON s.id_pengguna = pengguna.id").
			Where("s.token_hash = ? AND s.kedaluwarsa > now() AND pengguna.status", HashToken(token)).
			Take(&p).Error
		if err == nil {
			c.Set(kunciPengguna, &p)
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			respon.Server(c, err)
			return
		}
		c.Next()
	}
}

// WajibLogin menolak permintaan tanpa sesi yang sah (HTTP 401, kode SESI).
func WajibLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if Pengguna(c) == nil {
			respon.Sesi(c)
			return
		}
		c.Next()
	}
}

// WajibManager hanya meloloskan Manager (HTTP 403, kode AKSES).
func WajibManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		p := Pengguna(c)
		if p == nil {
			respon.Sesi(c)
			return
		}
		if !p.Manager() {
			respon.Akses(c, "Halaman ini hanya untuk Manager.")
			return
		}
		c.Next()
	}
}

// Pengguna mengambil pengguna yang sedang login, atau nil.
func Pengguna(c *gin.Context) *models.Pengguna {
	v, ok := c.Get(kunciPengguna)
	if !ok {
		return nil
	}
	p, _ := v.(*models.Pengguna)
	return p
}
