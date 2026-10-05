// Package seed mengisi database kosong dengan data contoh yang sama dengan
// frontend/js/data/seed.js, supaya frontend dan backend bisa dicoba bersama.
// Hanya berjalan jika tabel buku masih kosong.
package seed

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/DoniArmanS/zanafa-pulse/backend/internal/models"
)

const PasswordContoh = "zanafa123"

type bukuContoh struct {
	kode, judul, pengarang, penerbit, kategori string
	tahun                                      int
	harga                                      float64
	min                                        int
	stok                                       [3]int
	sampul                                     string
}

var kategori = []string{"Novel", "Sastra", "Pengembangan diri", "Nonfiksi", "Agama", "Pendidikan", "Bisnis", "Sejarah"}

var buku = []bukuContoh{
	{"BK-001", "Laut Bercerita", "Leila S. Chudori", "KPG", "Novel", 2017, 115000, 5, [3]int{7, 1, 9}, ""},
	{"BK-002", "Bumi Manusia", "Pramoedya Ananta Toer", "Lentera Dipantara", "Novel", 2005, 132000, 5, [3]int{12, 8, 6}, ""},
	{"BK-003", "Cantik Itu Luka", "Eka Kurniawan", "Gramedia Pustaka Utama", "Sastra", 2004, 125000, 4, [3]int{9, 11, 7}, "assets/covers/cantik-itu-luka.jpg"},
	{"BK-004", "Dilan: Dia adalah Dilanku Tahun 1990", "Pidi Baiq", "Pastel Books", "Novel", 2014, 89000, 5, [3]int{18, 9, 3}, "assets/covers/dilan-1990.jpg"},
	{"BK-005", "Sang Alkemis", "Paulo Coelho", "Gramedia Pustaka Utama", "Novel", 2005, 78000, 4, [3]int{14, 12, 9}, "assets/covers/the-alchemist.jpg"},
	{"BK-006", "Filosofi Teras", "Henry Manampiring", "Penerbit Buku Kompas", "Pengembangan diri", 2018, 98000, 6, [3]int{4, 10, 8}, ""},
	{"BK-007", "Atomic Habits", "James Clear", "Gramedia Pustaka Utama", "Pengembangan diri", 2019, 108000, 6, [3]int{9, 3, 7}, ""},
	{"BK-008", "Sapiens: Riwayat Singkat Umat Manusia", "Yuval Noah Harari", "KPG", "Nonfiksi", 2017, 135000, 4, [3]int{5, 6, 0}, ""},
	{"BK-009", "Bumi", "Tere Liye", "Gramedia Pustaka Utama", "Novel", 2014, 105000, 5, [3]int{10, 4, 8}, ""},
	{"BK-010", "Pulang", "Leila S. Chudori", "KPG", "Novel", 2012, 110000, 4, [3]int{3, 7, 6}, ""},
	{"BK-011", "Gadis Kretek", "Ratih Kumala", "Gramedia Pustaka Utama", "Novel", 2012, 98000, 4, [3]int{2, 0, 5}, ""},
	{"BK-012", "Negeri 5 Menara", "Ahmad Fuadi", "Gramedia Pustaka Utama", "Novel", 2009, 89000, 5, [3]int{4, 11, 27}, ""},
	{"BK-013", "Laskar Pelangi", "Andrea Hirata", "Bentang Pustaka", "Novel", 2005, 99000, 5, [3]int{16, 13, 11}, ""},
	{"BK-014", "Ronggeng Dukuh Paruk", "Ahmad Tohari", "Gramedia Pustaka Utama", "Sastra", 2003, 95000, 3, [3]int{6, 4, 5}, ""},
	{"BK-015", "Hujan", "Tere Liye", "Gramedia Pustaka Utama", "Novel", 2016, 98000, 5, [3]int{11, 6, 2}, ""},
	{"BK-016", "La Tahzan", "'Aidh al-Qarni", "Qisthi Press", "Agama", 2004, 99000, 5, [3]int{8, 14, 10}, ""},
	{"BK-017", "Sirah Nabawiyah", "Shafiyyurrahman al-Mubarakfuri", "Pustaka Al-Kautsar", "Agama", 1997, 150000, 3, [3]int{5, 3, 4}, ""},
	{"BK-018", "Ayat-Ayat Cinta", "Habiburrahman El Shirazy", "Republika", "Novel", 2004, 85000, 4, [3]int{7, 5, 9}, ""},
	{"BK-019", "Kamus Inggris-Indonesia", "John M. Echols, Hassan Shadily", "Gramedia Pustaka Utama", "Pendidikan", 2014, 185000, 3, [3]int{6, 4, 2}, ""},
	{"BK-020", "Sejarah Dunia yang Disembunyikan", "Jonathan Black", "Pustaka Alvabet", "Sejarah", 2015, 145000, 3, [3]int{0, 0, 0}, ""},
	{"BK-021", "Rich Dad Poor Dad", "Robert T. Kiyosaki", "Gramedia Pustaka Utama", "Bisnis", 2016, 88000, 4, [3]int{10, 7, 6}, ""},
	{"BK-022", "Berani Tidak Disukai", "Ichiro Kishimi, Fumitake Koga", "Gramedia Pustaka Utama", "Pengembangan diri", 2019, 98000, 4, [3]int{7, 2, 6}, ""},
	{"BK-023", "Hafalan Shalat Delisa", "Tere Liye", "Republika", "Novel", 2005, 79000, 4, [3]int{9, 8, 7}, ""},
	{"BK-024", "Rindu", "Tere Liye", "Republika", "Novel", 2014, 89000, 4, [3]int{5, 9, 3}, ""},
	{"BK-025", "Sebuah Seni untuk Bersikap Bodo Amat", "Mark Manson", "Grasindo", "Pengembangan diri", 2018, 85000, 5, [3]int{13, 8, 10}, ""},
}

type penggunaContoh struct {
	username, nama, role string
	cabang               int // 0 = tanpa cabang (Manager)
}

var pengguna = []penggunaContoh{
	{"sari", "Sari Wulandari", models.RoleStaff, 1},
	{"dimas", "Dimas Pratama", models.RoleStaff, 2},
	{"nurul", "Nurul Aisyah", models.RoleStaff, 3},
	{"rahmat", "Rahmat Hidayat", models.RoleManager, 0},
}

// Jalankan mengisi data contoh dalam satu transaksi. Aman dipanggil berulang.
func Jalankan(db *gorm.DB) error {
	var ada int64
	if err := db.Model(&models.Buku{}).Count(&ada).Error; err != nil {
		return err
	}
	if ada > 0 {
		log.Println("seed dilewati: tabel buku sudah berisi data")
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(PasswordContoh), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		cabangID := map[int]int{}
		for i := 1; i <= 3; i++ {
			c := models.Cabang{Nama: fmt.Sprintf("Cabang %d", i)}
			if err := tx.Create(&c).Error; err != nil {
				return err
			}
			cabangID[i] = c.ID
		}
		kategoriID := map[string]int{}
		for _, nama := range kategori {
			k := models.Kategori{Nama: nama}
			if err := tx.Create(&k).Error; err != nil {
				return err
			}
			kategoriID[nama] = k.ID
		}
		for _, u := range pengguna {
			p := models.Pengguna{Username: u.username, PasswordHash: string(hash), Nama: u.nama, Role: u.role, Status: true}
			if u.cabang > 0 {
				id := cabangID[u.cabang]
				p.IDCabang = &id
			}
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
		}
		for _, b := range buku {
			m := models.Buku{
				Kode: b.kode, Judul: b.judul, Pengarang: b.pengarang, Penerbit: b.penerbit, Tahun: b.tahun,
				Harga: b.harga, StokMinimum: b.min, IDKategori: kategoriID[b.kategori], Status: true,
			}
			if b.sampul != "" {
				s := b.sampul
				m.Sampul = &s
			}
			if err := tx.Create(&m).Error; err != nil {
				return err
			}
			for i, n := range b.stok {
				s := models.Stok{IDBuku: m.ID, IDCabang: cabangID[i+1], Jumlah: n}
				if err := tx.Omit("TanggalUpdate").Create(&s).Error; err != nil {
					return err
				}
			}
		}
		// TODO(Harits): tambahkan riwayat_stok contoh (jenis 'kurang' 40 hari terakhir)
		// supaya dashboard dan buku terlaris punya data. Lihat buatSeed() di frontend/js/data/seed.js.
		log.Printf("seed selesai: 3 cabang, %d kategori, %d pengguna, %d buku", len(kategori), len(pengguna), len(buku))
		return nil
	})
}
