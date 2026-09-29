
const LOGO_SRC = "assets/logo.png";
const PROFILE_PHOTO_SRC = "assets/profile-photo.jpg";

const BRANCHES = ["C1","C2","C3"];
const BRANCH_LABEL = {C1:"Cabang 1", C2:"Cabang 2", C3:"Cabang 3"};

const CATEGORIES = [
  "Romance","Fantasy","Mystery","Thriller","Horror","Science Fiction","Adventure",
  "Historical Fiction","Comedy","Drama","Biography","Autobiography","Self-Improvement",
  "Psychology","Philosophy","History","Religion","Education","Children","Young Adult",
  "Poetry","Short Story","Crime","Dystopian","Literary Fiction","Non-Fiction","Cooking",
  "Art","Health","Business","Technology"
];

let books = [
  {kode:"BK-001", judul:"Belajar Data Untuk Pemula", pengarang:"Ayu Lestari", penerbit:"Gramedia Pustaka Utama", kategori:"Technology", harga:85000, tahun:2022, stok:{C1:2,C2:10,C3:6}, min:5, terjual:12},
  {kode:"BK-002", judul:"Filosofi Teras", pengarang:"Henry Manampiring", penerbit:"Bentang Pustaka", kategori:"Philosophy", harga:120000, tahun:2019, stok:{C1:15,C2:8,C3:12}, min:5, terjual:9},
  {kode:"BK-003", judul:"Laut Bercerita", pengarang:"Leila S. Chudori", penerbit:"Mizan", kategori:"Historical Fiction", harga:95000, tahun:2017, stok:{C1:7,C2:1,C3:9}, min:5, terjual:6},
  {kode:"BK-004", judul:"Bumi Manusia", pengarang:"Pramoedya A. Toer", penerbit:"Gramedia Pustaka Utama", kategori:"Historical Fiction", harga:60000, tahun:1980, stok:{C1:20,C2:18,C3:14}, min:5, terjual:5},
  {kode:"BK-005", judul:"Atomic Habits", pengarang:"James Clear", penerbit:"Bentang Pustaka", kategori:"Self-Improvement", harga:75000, tahun:2018, stok:{C1:6,C2:6,C3:3}, min:5, terjual:8},
  {kode:"BK-006", judul:"Dilan 1990", pengarang:"Pidi Baiq", penerbit:"Bentang Pustaka", kategori:"Romance", harga:69000, tahun:2014, stok:{C1:18,C2:9,C3:11}, min:5, terjual:41, cover:"assets/covers/dilan-1990.jpg"},
  {kode:"BK-007", judul:"Bumi", pengarang:"Tere Liye", penerbit:"Mizan", kategori:"Fantasy", harga:89000, tahun:2014, stok:{C1:10,C2:4,C3:8}, min:5, terjual:18},
  {kode:"BK-008", judul:"Gadis Kretek", pengarang:"Eka Kurniawan", penerbit:"Gramedia Pustaka Utama", kategori:"Historical Fiction", harga:98000, tahun:2012, stok:{C1:3,C2:7,C3:2}, min:5, terjual:14},
  {kode:"BK-009", judul:"Cantik Itu Luka", pengarang:"Eka Kurniawan", penerbit:"Mizan", kategori:"Literary Fiction", harga:110000, tahun:2002, stok:{C1:9,C2:11,C3:7}, min:5, terjual:34, cover:"assets/covers/cantik-itu-luka.jpg"},
  {kode:"BK-010", judul:"Rectoverso", pengarang:"Dee Lestari", penerbit:"Bentang Pustaka", kategori:"Short Story", harga:72000, tahun:2008, stok:{C1:5,C2:5,C3:5}, min:5, terjual:16},
  {kode:"BK-011", judul:"Sapiens", pengarang:"Yuval Noah Harari", penerbit:"Gramedia Pustaka Utama", kategori:"Non-Fiction", harga:135000, tahun:2015, stok:{C1:13,C2:5,C3:10}, min:5, terjual:29},
  {kode:"BK-012", judul:"A Study in Scarlet", pengarang:"Arthur Conan Doyle", penerbit:"Mizan", kategori:"Mystery", harga:65000, tahun:1887, stok:{C1:8,C2:6,C3:9}, min:5, terjual:11},
  {kode:"BK-013", judul:"It", pengarang:"Stephen King", penerbit:"Bentang Pustaka", kategori:"Horror", harga:145000, tahun:1986, stok:{C1:4,C2:3,C3:6}, min:5, terjual:22},
  {kode:"BK-014", judul:"Negeri 5 Menara", pengarang:"Ahmad Fuadi", penerbit:"Bentang Pustaka", kategori:"Young Adult", harga:80000, tahun:2009, stok:{C1:4,C2:10,C3:6}, min:5, terjual:21},
  {kode:"BK-015", judul:"The Girl on the Train", pengarang:"Paula Hawkins", penerbit:"Gramedia Pustaka Utama", kategori:"Thriller", harga:99000, tahun:2015, stok:{C1:7,C2:8,C3:4}, min:5, terjual:19},
  {kode:"BK-016", judul:"Dune", pengarang:"Frank Herbert", penerbit:"Mizan", kategori:"Science Fiction", harga:150000, tahun:1965, stok:{C1:6,C2:9,C3:5}, min:5, terjual:26},
  {kode:"BK-017", judul:"The Alchemist", pengarang:"Paulo Coelho", penerbit:"Bentang Pustaka", kategori:"Adventure", harga:78000, tahun:1988, stok:{C1:14,C2:12,C3:9}, min:5, terjual:31, cover:"assets/covers/the-alchemist.jpg"},
  {kode:"BK-018", judul:"Steve Jobs", pengarang:"Walter Isaacson", penerbit:"Gramedia Pustaka Utama", kategori:"Biography", harga:158000, tahun:2011, stok:{C1:5,C2:4,C3:3}, min:5, terjual:17},
  {kode:"BK-019", judul:"Total Recall", pengarang:"Arnold Schwarzenegger", penerbit:"Mizan", kategori:"Autobiography", harga:132000, tahun:2012, stok:{C1:3,C2:2,C3:4}, min:5, terjual:7},
  {kode:"BK-020", judul:"Berpikir Cepat dan Lambat", pengarang:"Daniel Kahneman", penerbit:"Bentang Pustaka", kategori:"Psychology", harga:140000, tahun:2011, stok:{C1:9,C2:6,C3:8}, min:5, terjual:23},
  {kode:"BK-021", judul:"Cerita Tentang Bahagia", pengarang:"Tere Liye", penerbit:"Gramedia Pustaka Utama", kategori:"Children", harga:45000, tahun:2020, stok:{C1:16,C2:14,C3:10}, min:5, terjual:15},
  {kode:"BK-022", judul:"Kumpulan Puisi Senja", pengarang:"Rangga Pradipta", penerbit:"Mizan", kategori:"Poetry", harga:58000, tahun:2019, stok:{C1:6,C2:5,C3:7}, min:5, terjual:9},
  {kode:"BK-023", judul:"Panduan Bisnis Digital", pengarang:"Farah Az-Zahra", penerbit:"Bentang Pustaka", kategori:"Business", harga:105000, tahun:2023, stok:{C1:11,C2:7,C3:6}, min:5, terjual:13},
  {kode:"BK-024", judul:"Resep Masakan Nusantara", pengarang:"Wulan Sari", penerbit:"Gramedia Pustaka Utama", kategori:"Cooking", harga:88000, tahun:2021, stok:{C1:8,C2:9,C3:5}, min:5, terjual:20},
  {kode:"BK-025", judul:"Seni Rupa Indonesia", pengarang:"Bagas Wirawan", penerbit:"Mizan", kategori:"Art", harga:125000, tahun:2018, stok:{C1:2,C2:3,C3:2}, min:5, terjual:6},
  {kode:"BK-026", judul:"Hidup Sehat Setiap Hari", pengarang:"dr. Maya Anindita", penerbit:"Bentang Pustaka", kategori:"Health", harga:69000, tahun:2022, stok:{C1:10,C2:8,C3:9}, min:5, terjual:24},
  {kode:"BK-027", judul:"Pemrograman Web Modern", pengarang:"Ayu Lestari", penerbit:"Gramedia Pustaka Utama", kategori:"Technology", harga:115000, tahun:2024, stok:{C1:7,C2:6,C3:8}, min:5, terjual:27},
  {kode:"BK-028", judul:"Sejarah Nusantara", pengarang:"Prof. Slamet Widodo", penerbit:"Mizan", kategori:"History", harga:98000, tahun:2016, stok:{C1:5,C2:4,C3:6}, min:5, terjual:10},
];

let history = [
  {tanggal:"15/09/26", waktu:"09:12", staff:"Staff A", cabang:"C1", kode:"BK-001", judul:"Belajar Data Untuk Pemula", jenis:"Kurang", jumlah:-2, sebelum:4, sesudah:2},
  {tanggal:"15/09/26", waktu:"08:47", staff:"Staff B", cabang:"C2", kode:"BK-014", judul:"Negeri 5 Menara", jenis:"Tambah", jumlah:10, sebelum:0, sesudah:10},
  {tanggal:"14/09/26", waktu:"16:20", staff:"Staff C", cabang:"C3", kode:"BK-051", judul:"Judul Buku Baru X", jenis:"Update (Judul Baru)", jumlah:15, sebelum:"-", sesudah:15},
  {tanggal:"14/09/26", waktu:"11:05", staff:"Staff A", cabang:"C1", kode:"BK-004", judul:"Bumi Manusia", jenis:"Tambah", jumlah:5, sebelum:0, sesudah:5},
  {tanggal:"13/09/26", waktu:"10:40", staff:"Staff B", cabang:"C1", kode:"BK-052", judul:"Judul Buku Baru Y", jenis:"Update (Judul Baru)", jumlah:8, sebelum:"-", sesudah:8},
];

const PROFILE = {
  name: "Sarwenda S.Y. Aritonang",
  email: "sarwenda@gmail.com",
  phone: "+62 812-3456-7890",
  joined: "3 Januari 2024",
  photo: PROFILE_PHOTO_SRC
};

