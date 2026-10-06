// Package notifikasi mengirim email peringatan stok menipis ke Owner/Manager
// (Notifikasi.kirimEmail() dan Notifikasi.catatKegagalan() di class diagram).
//
// Email dikirim SETELAH perubahan stok tersimpan. Kalau gagal, perubahan stok tidak ikut batal:
// status_kirim tetap false dan dicoba lagi oleh KirimUlangBerkala.
package notifikasi

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/mail"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/email"
)

const maksPercobaan = 5

var (
	wib        = time.FixedZone("WIB", 7*60*60)
	namaBulan  = []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	labelJenis = map[string]string{"tambah": "Tambah", "kurang": "Kurang", "koreksi": "Koreksi jumlah", "judul_baru": "Judul baru"}
	berjalan   sync.WaitGroup
	sedang     sync.Map // id notifikasi yang sedang dikirim, supaya tidak terkirim dua kali
)

// Penerima = isi EMAIL_OWNER (boleh beberapa, dipisah koma), tanpa alamat ganda atau salah ketik.
func Penerima() []string {
	sudah := map[string]bool{}
	var daftar []string
	for _, mentah := range strings.Split(os.Getenv("EMAIL_OWNER"), ",") {
		a, err := mail.ParseAddress(strings.TrimSpace(mentah))
		if err != nil {
			continue
		}
		alamat := strings.ToLower(a.Address)
		if !sudah[alamat] {
			sudah[alamat] = true
			daftar = append(daftar, alamat)
		}
	}
	return daftar
}

type rincian struct {
	ID          int
	Tanggal     time.Time
	Kode        string
	Judul       string
	StokMinimum int
	Cabang      string
	StokKini    int
	StokSesudah *int
	Jenis       *string
	Keterangan  *string
	Pelaku      *string
}

func susunEmail(n rincian) (subjek, teks string) {
	sisa := n.StokKini
	if n.StokSesudah != nil {
		sisa = *n.StokSesudah
	}
	w := n.Tanggal.In(wib)
	baris := []string{
		"Stok buku berikut turun di bawah batas minimum.",
		"",
		fmt.Sprintf("Judul    : %s (%s)", n.Judul, n.Kode),
		fmt.Sprintf("Cabang   : %s", n.Cabang),
		fmt.Sprintf("Sisa stok: %d eksemplar", sisa),
		fmt.Sprintf("Minimum  : %d eksemplar", n.StokMinimum),
		fmt.Sprintf("Waktu    : %d %s %d pukul %02d.%02d WIB", w.Day(), namaBulan[w.Month()], w.Year(), w.Hour(), w.Minute()),
	}
	if n.Pelaku != nil && n.Jenis != nil {
		ket := ""
		if n.Keterangan != nil && *n.Keterangan != "" {
			ket = ", keterangan: " + *n.Keterangan
		}
		baris = append(baris, fmt.Sprintf("Diubah   : %s (%s%s)", *n.Pelaku, labelJenis[*n.Jenis], ket))
	}
	alamatApp := strings.TrimRight(os.Getenv("APP_URL"), "/")
	if alamatApp == "" {
		alamatApp = "http://localhost:8080"
	}
	baris = append(baris, "",
		fmt.Sprintf("Lihat stok di tiga cabang: %s/#/stok/%s", alamatApp, url.PathEscape(n.Kode)),
		"", "Email ini dikirim otomatis oleh Zanafa Pulse.")

	// judul email harus satu baris
	subjek = strings.Join(strings.Fields(fmt.Sprintf("[Zanafa Pulse] Stok menipis: %s di %s (sisa %d)", n.Judul, n.Cabang, sisa)), " ")
	return subjek, strings.Join(baris, "\n")
}

// Kirim mengirim email untuk satu notifikasi lalu mencatat hasilnya. true = terkirim.
func Kirim(ctx context.Context, db *gorm.DB, id int) bool {
	if _, sudah := sedang.LoadOrStore(id, true); sudah {
		return false
	}
	defer sedang.Delete(id)

	db = db.WithContext(ctx)
	var daftar []rincian
	err := db.Raw(`
		SELECT n.id, n.tanggal, b.kode, b.judul, b.stok_minimum, c.nama AS cabang, s.jumlah AS stok_kini,
		       r.stok_sesudah, r.jenis, r.keterangan, u.nama AS pelaku
		FROM notifikasi n
		JOIN stok s   ON s.id = n.id_stok
		JOIN buku b   ON b.id = s.id_buku
		JOIN cabang c ON c.id = s.id_cabang
		LEFT JOIN riwayat_stok r ON r.id = n.id_riwayat
		LEFT JOIN pengguna u     ON u.id = r.id_pengguna
		WHERE n.id = ? AND NOT n.status_kirim`, id).Scan(&daftar).Error
	if err != nil {
		log.Printf("notifikasi #%d tidak bisa dibaca: %v", id, err)
		return false
	}
	if len(daftar) == 0 {
		return false
	}

	subjek, teks := susunEmail(daftar[0])
	err = email.Kirim(Penerima(), subjek, teks)
	if errors.Is(err, email.ErrBelumDiatur) {
		return false // SMTP belum dipasang: biarkan belum terkirim, jangan dihitung sebagai percobaan
	}
	if err != nil {
		log.Printf("email notifikasi #%d gagal: %v", id, err)
		alasan := err.Error()
		if len(alasan) > 500 {
			alasan = alasan[:500]
		}
		if e := db.Exec("UPDATE notifikasi SET percobaan = percobaan + 1, galat_terakhir = ? WHERE id = ?", alasan, id).Error; e != nil {
			log.Printf("kegagalan notifikasi #%d tidak bisa dicatat: %v", id, e)
		}
		return false
	}
	if e := db.Exec("UPDATE notifikasi SET status_kirim = TRUE, percobaan = percobaan + 1, galat_terakhir = NULL WHERE id = ?", id).Error; e != nil {
		log.Printf("status notifikasi #%d tidak bisa dicatat: %v", id, e)
		return false
	}
	return true
}

// KirimDiLatar dipanggil controller setelah perubahan stok tersimpan, supaya pengguna tidak menunggu SMTP.
func KirimDiLatar(db *gorm.DB, id int) {
	berjalan.Add(1)
	go func() {
		defer berjalan.Done()
		ctx, batal := context.WithTimeout(context.Background(), 30*time.Second)
		defer batal()
		Kirim(ctx, db, id)
	}()
}

// Tunggu menunggu semua pengiriman di latar selesai (dipakai pengujian dan saat server dimatikan).
func Tunggu() { berjalan.Wait() }

// KirimUlang mencoba lagi email yang gagal dan belum terlalu sering dicoba.
func KirimUlang(ctx context.Context, db *gorm.DB) (dicoba, berhasil int) {
	var ids []struct{ ID int }
	err := db.WithContext(ctx).Raw(`
		SELECT id FROM notifikasi
		WHERE NOT status_kirim AND percobaan < ? AND tanggal > now() - interval '7 days'
		ORDER BY id LIMIT 20`, maksPercobaan).Scan(&ids).Error
	if err != nil {
		log.Printf("daftar kirim ulang tidak bisa dibaca: %v", err)
		return 0, 0
	}
	for _, x := range ids {
		if Kirim(ctx, db, x.ID) {
			berhasil++
		}
	}
	return len(ids), berhasil
}

// KirimUlangBerkala berjalan sampai ctx selesai. Selangnya NOTIFIKASI_ULANG_MENIT (bawaan 5, 0 = mati).
func KirimUlangBerkala(ctx context.Context, db *gorm.DB) {
	menit := 5
	if v := strings.TrimSpace(os.Getenv("NOTIFIKASI_ULANG_MENIT")); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			menit = n
		}
	}
	if menit <= 0 {
		return
	}
	pewaktu := time.NewTicker(time.Duration(menit) * time.Minute)
	defer pewaktu.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-pewaktu.C:
			if dicoba, berhasil := KirimUlang(ctx, db); dicoba > 0 {
				log.Printf("kirim ulang email notifikasi: %d dari %d berhasil", berhasil, dicoba)
			}
		}
	}
}
