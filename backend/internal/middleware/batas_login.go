package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/respon"
)

// Menahan tebak-tebakan password: 5 kali gagal per 15 menit untuk satu pasangan IP + username.
// Hitungannya di memori server, cukup untuk satu server seperti rencana proyek ini.
const (
	maksLoginGagal = 5
	jendelaLogin   = 15 * time.Minute
)

type catatanLogin struct {
	gagal int
	mulai time.Time
}

var (
	kunciLogin sync.Mutex
	loginGagal = map[string]*catatanLogin{}
)

func kunciCatatan(c *gin.Context, username string) string {
	return c.ClientIP() + "|" + strings.ToLower(strings.TrimSpace(username))
}

// LoginDitahan mengirim respons 429 dan mengembalikan true kalau percobaan sudah terlalu banyak.
func LoginDitahan(c *gin.Context, username string) bool {
	kunciLogin.Lock()
	defer kunciLogin.Unlock()
	k := kunciCatatan(c, username)
	cat := loginGagal[k]
	if cat == nil {
		return false
	}
	if time.Since(cat.mulai) > jendelaLogin {
		delete(loginGagal, k)
		return false
	}
	if cat.gagal < maksLoginGagal {
		return false
	}
	c.AbortWithStatusJSON(http.StatusTooManyRequests, respon.Galat{
		Kode: "TERLALU_SERING", Pesan: "Terlalu banyak percobaan masuk yang salah. Tunggu 15 menit, lalu coba lagi.",
	})
	return true
}

func CatatLoginGagal(c *gin.Context, username string) {
	kunciLogin.Lock()
	defer kunciLogin.Unlock()
	k := kunciCatatan(c, username)
	if cat := loginGagal[k]; cat != nil && time.Since(cat.mulai) <= jendelaLogin {
		cat.gagal++
		return
	}
	if len(loginGagal) > 10_000 { // jangan menumpuk tanpa batas
		loginGagal = map[string]*catatanLogin{}
	}
	loginGagal[k] = &catatanLogin{gagal: 1, mulai: time.Now()}
}

func HapusCatatanLogin(c *gin.Context, username string) {
	kunciLogin.Lock()
	delete(loginGagal, kunciCatatan(c, username))
	kunciLogin.Unlock()
}

// KosongkanCatatanLogin dipakai pengujian.
func KosongkanCatatanLogin() {
	kunciLogin.Lock()
	loginGagal = map[string]*catatanLogin{}
	kunciLogin.Unlock()
}
