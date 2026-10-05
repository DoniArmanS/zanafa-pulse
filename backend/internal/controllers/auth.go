package controllers

import (
	"errors"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/middleware"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// Bentuk pengguna yang dikirim ke frontend (tanpa password).
type penggunaJSON struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Nama     string `json:"nama"`
	Role     string `json:"role"`
	IDCabang *int   `json:"idCabang"`
}

func keJSON(p *models.Pengguna) penggunaJSON {
	return penggunaJSON{ID: p.ID, Username: p.Username, Nama: p.Nama, Role: p.Role, IDCabang: p.IDCabang}
}

// hashPalsu dipakai saat username tidak ada, supaya lama prosesnya sama
// dan penyerang tidak bisa menebak username mana yang terdaftar.
var hashPalsu, _ = bcrypt.GenerateFromPassword([]byte("bukan-password-asli"), bcrypt.DefaultCost)

// Login = User.login() di class diagram.
// POST /api/auth/login  { "username": "...", "password": "..." }
func (h *Controller) Login(c *gin.Context) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || strings.TrimSpace(in.Username) == "" || in.Password == "" {
		respon.Validasi(c, "username", "Isi username dan password.")
		return
	}

	var p models.Pengguna
	err := h.DB.WithContext(c).Where("lower(username) = lower(?) AND status", strings.TrimSpace(in.Username)).Take(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		_ = bcrypt.CompareHashAndPassword(hashPalsu, []byte(in.Password))
		respon.Kredensial(c)
		return
	}
	if err != nil {
		respon.Server(c, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(p.PasswordHash), []byte(in.Password)) != nil {
		respon.Kredensial(c)
		return
	}
	// TODO(Harits): batasi percobaan login (mis. 5 kali gagal per 15 menit per IP/username).

	token, hash, err := middleware.BuatToken()
	if err != nil {
		respon.Server(c, err)
		return
	}
	sesi := models.Sesi{TokenHash: hash, IDPengguna: p.ID, Kedaluwarsa: time.Now().Add(h.Config.LamaSesi)}
	if err := h.DB.WithContext(c).Create(&sesi).Error; err != nil {
		respon.Server(c, err)
		return
	}
	middleware.PasangCookie(c, token, h.Config.LamaSesi, h.Config.Produksi())
	respon.OK(c, keJSON(&p))
}

// Logout = User.logout(). Menghapus sesi di database dan cookie di browser.
// POST /api/auth/logout
func (h *Controller) Logout(c *gin.Context) {
	if token, err := c.Cookie(middleware.NamaCookie); err == nil && token != "" {
		if err := h.DB.WithContext(c).Where("token_hash = ?", middleware.HashToken(token)).Delete(&models.Sesi{}).Error; err != nil {
			respon.Server(c, err)
			return
		}
	}
	middleware.HapusCookie(c, h.Config.Produksi())
	respon.OK(c, gin.H{"keluar": true})
}

// Saya mengembalikan pengguna yang sedang login (dipakai frontend saat aplikasi dibuka).
// GET /api/auth/saya
func (h *Controller) Saya(c *gin.Context) {
	respon.OK(c, keJSON(middleware.Pengguna(c)))
}
