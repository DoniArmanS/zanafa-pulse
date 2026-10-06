package seed

import (
	"fmt"
	"math"
	"sort"
	"time"

	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
)

// WaktuAcuan = "sekarang" untuk riwayat contoh. Pengujian menggantinya supaya hasilnya bisa dipastikan.
var WaktuAcuan = time.Now

// laris 0..3 per buku, sama dengan kolom terakhir BUKU di frontend/js/data/seed.js.
var laris = map[string]int{
	"BK-001": 3, "BK-002": 2, "BK-003": 3, "BK-004": 3, "BK-005": 2, "BK-006": 3, "BK-007": 3, "BK-008": 1, "BK-009": 2,
	"BK-010": 1, "BK-011": 2, "BK-012": 2, "BK-013": 2, "BK-014": 0, "BK-015": 2, "BK-016": 2, "BK-017": 1, "BK-018": 1,
	"BK-019": 1, "BK-020": 0, "BK-021": 1, "BK-022": 2, "BK-023": 1, "BK-024": 1, "BK-025": 2,
}

var keteranganContoh = map[string][]string{
	models.JenisTambah:  {"Kiriman penerbit", "Restok dari gudang", "Retur dari cabang lain", ""},
	models.JenisKurang:  {"Terjual", "Terjual", "Terjual", "Terjual", "Rusak saat display", ""},
	models.JenisKoreksi: {"Hasil stok opname", "Selisih hitung ulang"},
}

// acak = mulberry32, sama dengan yang dipakai frontend, supaya datanya sama persis.
func acak(benih uint32) func() float64 {
	a := benih
	return func() float64 {
		a += 0x6d2b79f5
		t := a
		t = (t ^ (t >> 15)) * (t | 1)
		t ^= t + (t^(t>>7))*(t|61)
		return float64(t^(t>>14)) / 4294967296
	}
}

func waktuDariMs(ms float64) time.Time { return time.UnixMilli(int64(ms)).UTC() }

// isiRiwayatContoh menambahkan riwayat_stok 40 hari terakhir dan notifikasi stok menipis,
// mengikuti buatSeed() di frontend/js/data/seed.js. Dipanggil di dalam transaksi seed.
func isiRiwayatContoh(tx *gorm.DB, cabangID map[int]int) error {
	var stok []struct{ ID, IDBuku, IDCabang int }
	if err := tx.Table("stok").Select("id, id_buku, id_cabang").Scan(&stok).Error; err != nil {
		return err
	}
	var semuaBuku []struct {
		ID   int
		Kode string
	}
	if err := tx.Table("buku").Select("id, kode").Scan(&semuaBuku).Error; err != nil {
		return err
	}
	var semuaPengguna []struct {
		ID       int
		Username string
	}
	if err := tx.Table("pengguna").Select("id, username").Scan(&semuaPengguna).Error; err != nil {
		return err
	}
	idBuku := map[string]int{}
	for _, b := range semuaBuku {
		idBuku[b.Kode] = b.ID
	}
	idStok := map[[2]int]int{} // [id_buku, id_cabang] -> id stok
	for _, s := range stok {
		idStok[[2]int{s.IDBuku, s.IDCabang}] = s.ID
	}
	idPengguna := map[string]int{}
	for _, p := range semuaPengguna {
		idPengguna[p.Username] = p.ID
	}

	sekarang := float64(WaktuAcuan().UnixMilli())
	rnd := acak(20260930)
	type baris struct {
		ms float64
		r  models.RiwayatStok
	}
	var riwayat []baris

	for _, b := range buku {
		tingkat := laris[b.kode]
		for ci, n := range b.stok {
			nomorCabang := ci + 1
			ids := idStok[[2]int{idBuku[b.kode], cabangID[nomorCabang]}]
			staff := idPengguna[pengguna[ci].username]

			// riwayat dibuat mundur dari stok sekarang, jadi sebelum/sesudah selalu cocok
			sesudah := n
			waktu := sekarang - (20+rnd()*180)*60e3
			banyak := 2 + int(math.Floor(rnd()*float64(2+tingkat*2)))
			for k := 0; k < banyak && waktu > sekarang-40*864e5; k++ {
				r := rnd()
				var jenis string
				var delta int
				switch {
				case r < 0.62+float64(tingkat)*0.06:
					jenis = models.JenisKurang
					delta = -(1 + int(math.Floor(rnd()*float64(tingkat+1))))
				case r < 0.95:
					jenis = models.JenisTambah
					delta = 5 + int(math.Floor(rnd()*12))
					if sesudah-delta < 0 {
						jenis = models.JenisKurang
						delta = -(1 + int(math.Floor(rnd()*2)))
					}
				default:
					jenis = models.JenisKoreksi
					if rnd() < 0.5 {
						delta = -1
					} else {
						delta = 1
					}
					if sesudah-delta < 0 {
						delta = -1
					}
				}
				sebelum := sesudah - delta
				pelaku := staff
				if rnd() < 0.15 {
					pelaku = idPengguna[pengguna[3].username] // sesekali Manager yang mengubah
				}
				pilihan := keteranganContoh[jenis]
				ket := pilihan[int(math.Floor(rnd()*float64(len(pilihan))))]
				riwayat = append(riwayat, baris{ms: math.Trunc(waktu), r: models.RiwayatStok{
					IDStok: ids, IDPengguna: pelaku, Jenis: jenis, Jumlah: delta,
					StokSebelum: sebelum, StokSesudah: sesudah, Tanggal: waktuDariMs(waktu), Keterangan: ket,
				}})
				sesudah = sebelum
				waktu -= (6 + rnd()*90) * 3600e3
			}

			if models.Menipis(n, b.min) {
				// satu notifikasi sengaja dibuat gagal terkirim supaya tampilan gagal bisa dicoba
				terkirim := !(b.kode == "BK-011" && nomorCabang == 2)
				tanggal := waktuDariMs(sekarang - (1+rnd()*30)*3600e3)
				pesan := fmt.Sprintf("Stok %s di Cabang %d tinggal %d (batas minimum %d).", b.judul, nomorCabang, n, b.min)
				var galat any
				percobaan := 1
				if !terkirim {
					galat = "Contoh kegagalan dari data awal"
					percobaan = 5 // tidak ikut dicoba ulang
				}
				err := tx.Exec("INSERT INTO notifikasi (id_stok, pesan, tanggal, status_kirim, percobaan, galat_terakhir) VALUES (?, ?, ?, ?, ?, ?)",
					ids, pesan, tanggal, terkirim, percobaan, galat).Error
				if err != nil {
					return err
				}
			}
		}
	}

	// simpan dari yang paling lama supaya urutan id sama dengan urutan waktu
	sort.SliceStable(riwayat, func(i, j int) bool { return riwayat[i].ms < riwayat[j].ms })
	for i := range riwayat {
		if err := tx.Create(&riwayat[i].r).Error; err != nil {
			return err
		}
	}
	return nil
}
