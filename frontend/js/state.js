

const state = {
  loggedIn:false,
  publicMode:false,   // Cek Stok tanpa login (UC: Memeriksa Stok Buku)
  role:null,          // "staff" | "manager"
  loginRole:"staff",  
  username:"",
  cabang:"C1",
  view:"login",
  loginError:"",
  katalogQuery:"",
  katalogCategory:"",
  katalogPage:1,
  cekStokQuery:"",
  cekStokSelected: null,
  kelolaQuery:"",
  kelolaCategory:"",
  kelolaSelected:null,   
  jenisPerubahan:"tambah",
  jumlahPerubahan:"",
  keteranganPerubahan:"",
  stockError:"",
  newBook:{ kode:"", kategori:"", judul:"", pengarang:"", penerbit:"", harga:"", tahun:"", cabangTujuan:"C1", stokAwal:"", batasMin:"" },
  newBookError:"",
  riwayat:{cabang:"", staff:"", jenis:"", from:"", to:""},
  toast:null,
};

const PAGE_SIZE = 10;

