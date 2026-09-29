// Data contoh untuk prototipe. Bentuk tabel mengikuti class diagram
// (+ kode, penerbit, tahun, sampul sesuai keputusan produk no. 1).
// Nanti diganti oleh database backend; frontend hanya membaca lewat api.js.

const KATEGORI = ["Novel", "Sastra", "Pengembangan diri", "Nonfiksi", "Agama", "Pendidikan", "Bisnis", "Sejarah"];

// [kode, judul, pengarang, penerbit, kategori, tahun, harga, stokMinimum, stok C1/C2/C3, sampul, laris 0..3]
const BUKU = [
  ["BK-001", "Laut Bercerita", "Leila S. Chudori", "KPG", "Novel", 2017, 115000, 5, [7, 1, 9], null, 3],
  ["BK-002", "Bumi Manusia", "Pramoedya Ananta Toer", "Lentera Dipantara", "Novel", 2005, 132000, 5, [12, 8, 6], null, 2],
  ["BK-003", "Cantik Itu Luka", "Eka Kurniawan", "Gramedia Pustaka Utama", "Sastra", 2004, 125000, 4, [9, 11, 7], "assets/covers/cantik-itu-luka.jpg", 3],
  ["BK-004", "Dilan: Dia adalah Dilanku Tahun 1990", "Pidi Baiq", "Pastel Books", "Novel", 2014, 89000, 5, [18, 9, 3], "assets/covers/dilan-1990.jpg", 3],
  ["BK-005", "Sang Alkemis", "Paulo Coelho", "Gramedia Pustaka Utama", "Novel", 2005, 78000, 4, [14, 12, 9], "assets/covers/the-alchemist.jpg", 2],
  ["BK-006", "Filosofi Teras", "Henry Manampiring", "Penerbit Buku Kompas", "Pengembangan diri", 2018, 98000, 6, [4, 10, 8], null, 3],
  ["BK-007", "Atomic Habits", "James Clear", "Gramedia Pustaka Utama", "Pengembangan diri", 2019, 108000, 6, [9, 3, 7], null, 3],
  ["BK-008", "Sapiens: Riwayat Singkat Umat Manusia", "Yuval Noah Harari", "KPG", "Nonfiksi", 2017, 135000, 4, [5, 6, 0], null, 1],
  ["BK-009", "Bumi", "Tere Liye", "Gramedia Pustaka Utama", "Novel", 2014, 105000, 5, [10, 4, 8], null, 2],
  ["BK-010", "Pulang", "Leila S. Chudori", "KPG", "Novel", 2012, 110000, 4, [3, 7, 6], null, 1],
  ["BK-011", "Gadis Kretek", "Ratih Kumala", "Gramedia Pustaka Utama", "Novel", 2012, 98000, 4, [2, 0, 5], null, 2],
  ["BK-012", "Negeri 5 Menara", "Ahmad Fuadi", "Gramedia Pustaka Utama", "Novel", 2009, 89000, 5, [4, 11, 27], null, 2],
  ["BK-013", "Laskar Pelangi", "Andrea Hirata", "Bentang Pustaka", "Novel", 2005, 99000, 5, [16, 13, 11], null, 2],
  ["BK-014", "Ronggeng Dukuh Paruk", "Ahmad Tohari", "Gramedia Pustaka Utama", "Sastra", 2003, 95000, 3, [6, 4, 5], null, 0],
  ["BK-015", "Hujan", "Tere Liye", "Gramedia Pustaka Utama", "Novel", 2016, 98000, 5, [11, 6, 2], null, 2],
  ["BK-016", "La Tahzan", "'Aidh al-Qarni", "Qisthi Press", "Agama", 2004, 99000, 5, [8, 14, 10], null, 2],
  ["BK-017", "Sirah Nabawiyah", "Shafiyyurrahman al-Mubarakfuri", "Pustaka Al-Kautsar", "Agama", 1997, 150000, 3, [5, 3, 4], null, 1],
  ["BK-018", "Ayat-Ayat Cinta", "Habiburrahman El Shirazy", "Republika", "Novel", 2004, 85000, 4, [7, 5, 9], null, 1],
  ["BK-019", "Kamus Inggris-Indonesia", "John M. Echols, Hassan Shadily", "Gramedia Pustaka Utama", "Pendidikan", 2014, 185000, 3, [6, 4, 2], null, 1],
  ["BK-020", "Sejarah Dunia yang Disembunyikan", "Jonathan Black", "Pustaka Alvabet", "Sejarah", 2015, 145000, 3, [0, 0, 0], null, 0],
  ["BK-021", "Rich Dad Poor Dad", "Robert T. Kiyosaki", "Gramedia Pustaka Utama", "Bisnis", 2016, 88000, 4, [10, 7, 6], null, 1],
  ["BK-022", "Berani Tidak Disukai", "Ichiro Kishimi, Fumitake Koga", "Gramedia Pustaka Utama", "Pengembangan diri", 2019, 98000, 4, [7, 2, 6], null, 2],
  ["BK-023", "Hafalan Shalat Delisa", "Tere Liye", "Republika", "Novel", 2005, 79000, 4, [9, 8, 7], null, 1],
  ["BK-024", "Rindu", "Tere Liye", "Republika", "Novel", 2014, 89000, 4, [5, 9, 3], null, 1],
  ["BK-025", "Sebuah Seni untuk Bersikap Bodo Amat", "Mark Manson", "Grasindo", "Pengembangan diri", 2018, 85000, 5, [13, 8, 10], null, 2],
];

const PENGGUNA = [
  { id: 1, username: "sari", password: "zanafa123", nama: "Sari Wulandari", role: "staff", idCabang: 1 },
  { id: 2, username: "dimas", password: "zanafa123", nama: "Dimas Pratama", role: "staff", idCabang: 2 },
  { id: 3, username: "nurul", password: "zanafa123", nama: "Nurul Aisyah", role: "staff", idCabang: 3 },
  { id: 4, username: "rahmat", password: "zanafa123", nama: "Rahmat Hidayat", role: "manager", idCabang: null },
];

function acak(benih) {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KETERANGAN = {
  tambah: ["Kiriman penerbit", "Restok dari gudang", "Retur dari cabang lain", ""],
  kurang: ["Terjual", "Terjual", "Terjual", "Terjual", "Rusak saat display", ""],
  koreksi: ["Hasil stok opname", "Selisih hitung ulang"],
};

export function buatSeed(sekarang = Date.now()) {
  const rnd = acak(20260930);
  const cabang = [1, 2, 3].map((id) => ({ id, nama: `Cabang ${id}`, alamat: "", noTelepon: "" }));
  const kategori = KATEGORI.map((nama, i) => ({ id: i + 1, nama, deskripsi: "" }));
  const buku = [];
  const stok = [];
  const riwayat = [];
  const notifikasi = [];
  let idStok = 1;
  let idRiwayat = 1;

  BUKU.forEach((b, i) => {
    const [kode, judul, pengarang, penerbit, kat, tahun, harga, min, jumlah, sampul, laris] = b;
    const idBuku = i + 1;
    buku.push({
      id: idBuku, kode, judul, pengarang, penerbit, tahun, harga, stokMinimum: min, sampul,
      idKategori: KATEGORI.indexOf(kat) + 1, status: true,
    });
    jumlah.forEach((n, ci) => {
      const idCabang = ci + 1;
      const s = { id: idStok++, idBuku, idCabang, jumlah: n, tanggalUpdate: new Date(sekarang - 3600e3).toISOString() };
      stok.push(s);

      // Riwayat dibuat mundur dari stok sekarang, jadi sebelum/sesudah selalu konsisten.
      const staff = PENGGUNA.find((u) => u.idCabang === idCabang);
      let sesudah = n;
      let waktu = sekarang - (20 + rnd() * 180) * 60e3;
      const banyak = 2 + Math.floor(rnd() * (2 + laris * 2));
      for (let k = 0; k < banyak && waktu > sekarang - 40 * 864e5; k++) {
        const r = rnd();
        let jenis, delta;
        if (r < 0.62 + laris * 0.06) {
          jenis = "kurang";
          delta = -(1 + Math.floor(rnd() * (laris + 1)));
        } else if (r < 0.95) {
          jenis = "tambah";
          delta = 5 + Math.floor(rnd() * 12);
          if (sesudah - delta < 0) {
            jenis = "kurang";
            delta = -(1 + Math.floor(rnd() * 2));
          }
        } else {
          jenis = "koreksi";
          delta = rnd() < 0.5 ? -1 : 1;
          if (sesudah - delta < 0) delta = -1;
        }
        const sebelum = sesudah - delta;
        const pelaku = rnd() < 0.15 ? PENGGUNA[3] : staff;
        const ket = KETERANGAN[jenis][Math.floor(rnd() * KETERANGAN[jenis].length)];
        riwayat.push({
          id: 0, idStok: s.id, idUser: pelaku.id, jenis, jumlah: delta, sebelum, sesudah,
          tanggal: new Date(waktu).toISOString(), keterangan: ket,
        });
        sesudah = sebelum;
        waktu -= (6 + rnd() * 90) * 3600e3;
      }
      if (n < min) {
        notifikasi.push({
          id: notifikasi.length + 1, idStok: s.id, idRiwayat: null,
          pesan: `Stok ${judul} di Cabang ${idCabang} tinggal ${n} (batas minimum ${min}).`,
          tanggal: new Date(sekarang - (1 + rnd() * 30) * 3600e3).toISOString(),
          statusKirim: !(kode === "BK-011" && idCabang === 2),
        });
      }
    });
  });

  riwayat.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  riwayat.forEach((r) => (r.id = idRiwayat++));

  return {
    versi: 1,
    cabang, kategori, buku, stok, riwayat, notifikasi,
    pengguna: PENGGUNA.map((u) => ({ ...u, status: true })),
    idBerikut: { buku: buku.length + 1, stok: idStok, riwayat: idRiwayat, notifikasi: notifikasi.length + 1, kategori: kategori.length + 1 },
  };
}
