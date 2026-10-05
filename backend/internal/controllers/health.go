package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Health dipakai Docker/monitoring untuk memeriksa apakah server dan database hidup.
// GET /api/health
func (h *Controller) Health(c *gin.Context) {
	ctx, batal := context.WithTimeout(c, 2*time.Second)
	defer batal()
	sqlDB, err := h.DB.DB()
	if err == nil {
		err = sqlDB.PingContext(ctx)
	}
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "gagal", "database": "tidak terhubung"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "database": "terhubung", "waktu": time.Now().UTC()})
}
