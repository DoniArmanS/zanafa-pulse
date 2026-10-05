package models

import (
	"errors"
	"testing"
)

func TestHitungStokBaru(t *testing.T) {
	kasus := []struct {
		nama     string
		jenis    string
		sekarang int
		jumlah   int
		hasil    int
		galat    string // field yang diharapkan salah, kosong = sukses
	}{
		{"tambah biasa", JenisTambah, 7, 3, 10, ""},
		{"tambah nol ditolak", JenisTambah, 7, 0, 0, "jumlah"},
		{"kurang biasa", JenisKurang, 7, 2, 5, ""},
		{"kurang sampai habis", JenisKurang, 7, 7, 0, ""},
		{"kurang melebihi stok", JenisKurang, 7, 8, 0, "jumlah"},
		{"koreksi ke angka lain", JenisKoreksi, 7, 4, 4, ""},
		{"koreksi ke nol", JenisKoreksi, 7, 0, 0, ""},
		{"koreksi sama dengan stok", JenisKoreksi, 7, 7, 0, "jumlah"},
		{"koreksi negatif", JenisKoreksi, 7, -1, 0, "jumlah"},
		{"jenis tidak dikenal", "hapus", 7, 1, 0, "jenis"},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			hasil, err := HitungStokBaru(k.jenis, k.sekarang, k.jumlah, 1)
			if k.galat == "" {
				if err != nil {
					t.Fatalf("tidak diharapkan galat, dapat %v", err)
				}
				if hasil != k.hasil {
					t.Fatalf("hasil %d, diharapkan %d", hasil, k.hasil)
				}
				return
			}
			var ev ErrValidasi
			if !errors.As(err, &ev) || ev.Field != k.galat {
				t.Fatalf("diharapkan galat pada field %q, dapat %v", k.galat, err)
			}
		})
	}
}

func TestMenipis(t *testing.T) {
	if Menipis(5, 5) {
		t.Error("stok sama dengan minimum tidak boleh dianggap menipis")
	}
	if !Menipis(4, 5) {
		t.Error("stok di bawah minimum harus dianggap menipis")
	}
}
