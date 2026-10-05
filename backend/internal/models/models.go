// Package models berisi struktur data (Model dalam MVC), satu struct per tabel.
// Nama dan kolom mengikuti migrations/000001_skema_awal.up.sql.
package models

import "time"

type Cabang struct {
	ID        int    `gorm:"column:id;primaryKey"`
	Nama      string `gorm:"column:nama"`
	Alamat    string `gorm:"column:alamat"`
	NoTelepon string `gorm:"column:no_telepon"`
}

func (Cabang) TableName() string { return "cabang" }

type Kategori struct {
	ID        int    `gorm:"column:id;primaryKey"`
	Nama      string `gorm:"column:nama"`
	Deskripsi string `gorm:"column:deskripsi"`
}

func (Kategori) TableName() string { return "kategori" }

const (
	RoleStaff   = "staff"
	RoleManager = "manager"
)

// Pengguna = kelas User di class diagram (Staff dan Manager dibedakan lewat Role).
type Pengguna struct {
	ID           int       `gorm:"column:id;primaryKey"`
	Username     string    `gorm:"column:username"`
	PasswordHash string    `gorm:"column:password_hash"`
	Nama         string    `gorm:"column:nama"`
	Role         string    `gorm:"column:role"`
	IDCabang     *int      `gorm:"column:id_cabang"`
	Status       bool      `gorm:"column:status"`
	Dibuat       time.Time `gorm:"column:dibuat;autoCreateTime"`
}

func (Pengguna) TableName() string { return "pengguna" }

func (p Pengguna) Manager() bool { return p.Role == RoleManager }

// BolehUbahCabang: Staff hanya cabangnya sendiri, Manager semua cabang.
func (p Pengguna) BolehUbahCabang(idCabang int) bool {
	return p.Manager() || (p.IDCabang != nil && *p.IDCabang == idCabang)
}

type Buku struct {
	ID          int       `gorm:"column:id;primaryKey"`
	Kode        string    `gorm:"column:kode"`
	Judul       string    `gorm:"column:judul"`
	Pengarang   string    `gorm:"column:pengarang"`
	Penerbit    string    `gorm:"column:penerbit"`
	Tahun       int       `gorm:"column:tahun"`
	Harga       float64   `gorm:"column:harga"` // NUMERIC(12,2) di database
	StokMinimum int       `gorm:"column:stok_minimum"`
	Sampul      *string   `gorm:"column:sampul"`
	IDKategori  int       `gorm:"column:id_kategori"`
	Status      bool      `gorm:"column:status"`
	Dibuat      time.Time `gorm:"column:dibuat;autoCreateTime"`
}

func (Buku) TableName() string { return "buku" }

type Stok struct {
	ID            int       `gorm:"column:id;primaryKey"`
	IDBuku        int       `gorm:"column:id_buku"`
	IDCabang      int       `gorm:"column:id_cabang"`
	Jumlah        int       `gorm:"column:jumlah"`
	TanggalUpdate time.Time `gorm:"column:tanggal_update"`
}

func (Stok) TableName() string { return "stok" }

type RiwayatStok struct {
	ID          int64     `gorm:"column:id;primaryKey"`
	IDStok      int       `gorm:"column:id_stok"`
	IDPengguna  int       `gorm:"column:id_pengguna"`
	Jenis       string    `gorm:"column:jenis"`
	Jumlah      int       `gorm:"column:jumlah"`
	StokSebelum int       `gorm:"column:stok_sebelum"`
	StokSesudah int       `gorm:"column:stok_sesudah"`
	Tanggal     time.Time `gorm:"column:tanggal"`
	Keterangan  string    `gorm:"column:keterangan"`
}

func (RiwayatStok) TableName() string { return "riwayat_stok" }

type Notifikasi struct {
	ID          int       `gorm:"column:id;primaryKey"`
	IDStok      int       `gorm:"column:id_stok"`
	IDRiwayat   *int64    `gorm:"column:id_riwayat"`
	Pesan       string    `gorm:"column:pesan"`
	Tanggal     time.Time `gorm:"column:tanggal"`
	StatusKirim bool      `gorm:"column:status_kirim"`
}

func (Notifikasi) TableName() string { return "notifikasi" }

type Laporan struct {
	ID            int        `gorm:"column:id;primaryKey"`
	IDPengguna    int        `gorm:"column:id_pengguna"`
	JenisLaporan  string     `gorm:"column:jenis_laporan"`
	PeriodeAwal   *time.Time `gorm:"column:periode_awal"`
	PeriodeAkhir  *time.Time `gorm:"column:periode_akhir"`
	TanggalDibuat time.Time  `gorm:"column:tanggal_dibuat"`
}

func (Laporan) TableName() string { return "laporan" }

type Sesi struct {
	TokenHash   string    `gorm:"column:token_hash;primaryKey"`
	IDPengguna  int       `gorm:"column:id_pengguna"`
	Kedaluwarsa time.Time `gorm:"column:kedaluwarsa"`
	Dibuat      time.Time `gorm:"column:dibuat;autoCreateTime"`
}

func (Sesi) TableName() string { return "sesi" }
