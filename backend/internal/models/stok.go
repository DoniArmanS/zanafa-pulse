package models

import "fmt"

const (
	JenisTambah    = "tambah"
	JenisKurang    = "kurang"
	JenisKoreksi   = "koreksi"
	JenisJudulBaru = "judul_baru"
)

// ErrValidasi adalah kesalahan isian yang pesannya aman ditampilkan ke pengguna.
type ErrValidasi struct {
	Field string
	Pesan string
}

func (e ErrValidasi) Error() string { return e.Pesan }

// HitungStokBaru = logika Stok.updateJumlah() di class diagram.
// Tidak menyentuh database supaya mudah diuji (lihat stok_test.go).
func HitungStokBaru(jenis string, sekarang, jumlah, idCabang int) (int, error) {
	switch jenis {
	case JenisTambah:
		if jumlah < 1 {
			return 0, ErrValidasi{"jumlah", "Jumlah yang ditambah minimal 1."}
		}
		return sekarang + jumlah, nil
	case JenisKurang:
		if jumlah < 1 {
			return 0, ErrValidasi{"jumlah", "Jumlah yang dikurangi minimal 1."}
		}
		if jumlah > sekarang {
			return 0, ErrValidasi{"jumlah", fmt.Sprintf(
				"Stok Cabang %d tinggal %d. Jumlah yang dikurangi tidak boleh lebih dari %d.", idCabang, sekarang, sekarang)}
		}
		return sekarang - jumlah, nil
	case JenisKoreksi:
		if jumlah < 0 {
			return 0, ErrValidasi{"jumlah", "Jumlah hasil hitung tidak boleh negatif."}
		}
		if jumlah == sekarang {
			return 0, ErrValidasi{"jumlah", "Jumlahnya sama dengan stok sekarang, tidak ada yang diubah."}
		}
		return jumlah, nil
	default:
		return 0, ErrValidasi{"jenis", "Pilih jenis perubahan: tambah, kurang, atau koreksi."}
	}
}

// Menipis = Stok.cekStokMinimum(): stok di bawah batas minimum (bukan "sama dengan").
func Menipis(jumlah, minimum int) bool { return jumlah < minimum }
