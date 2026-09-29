// Satu-satunya pintu data frontend. Sekarang memakai data contoh di localStorage;
// saat backend siap, isi tiap fungsi diganti fetch("/api/...") tanpa mengubah halaman.
// Lihat BACKEND-INTEGRATION.md untuk pemetaan fungsi -> endpoint.
import { buatSeed } from "./data/seed.js";

const KUNCI_DB = "zanafa-db-v1";
const KUNCI_SESI = "zanafa-sesi-v1";
const KUNCI_UJI_GAGAL = "zanafa-uji-gagal";
const HARI = 864e5;

export class ApiError extends Error {
  constructor(kode, pesan, field) {
    super(pesan);
    this.kode = kode;
    this.field = field;
  }
}

let db = null;

function muat() {
  if (db) return db;
  try {
    const s = localStorage.getItem(KUNCI_DB);
    if (s) db = JSON.parse(s);
  } catch (_) {
    db = null;
  }
  if (!db || db.versi !== 1) {
    db = buatSeed();
    simpan();
  }
  return db;
}

function simpan() {
  try {
    localStorage.setItem(KUNCI_DB, JSON.stringify(db));
  } catch (_) {
    /* penyimpanan penuh atau diblokir: data tetap ada selama tab terbuka */
  }
}

function tunda() {
  return new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
}

// Uji keadaan error: sessionStorage["zanafa-uji-gagal"] = nama fungsi (mis. "getBuku") -> gagal sekali.
async function jaringan(nama = "") {
  await tunda();
  let gagal = false;
  try {
    const t = sessionStorage.getItem(KUNCI_UJI_GAGAL);
    gagal = !!t && (t === nama || t === "*");
    if (gagal) sessionStorage.removeItem(KUNCI_UJI_GAGAL);
  } catch (_) {}
  if (gagal) throw new ApiError("JARINGAN", "Server tidak menjawab.");
  muat();
}

/* ---------- Sesi ---------- */

export function sesiSaatIni() {
  muat();
  try {
    const s = JSON.parse(localStorage.getItem(KUNCI_SESI) || "null");
    if (!s) return null;
    const u = db.pengguna.find((p) => p.id === s.idUser && p.status);
    return u ? publikPengguna(u) : null;
  } catch (_) {
    return null;
  }
}

function publikPengguna(u) {
  return { id: u.id, username: u.username, nama: u.nama, role: u.role, idCabang: u.idCabang };
}

function wajibLogin() {
  const u = sesiSaatIni();
  if (!u) throw new ApiError("SESI", "Sesi berakhir. Silakan masuk lagi.");
  return u;
}

function wajibManager() {
  const u = wajibLogin();
  if (u.role !== "manager") throw new ApiError("AKSES", "Halaman ini hanya untuk Manager.");
  return u;
}

export async function login(username, password) {
  await jaringan("login");
  const u = db.pengguna.find((p) => p.username === String(username).trim().toLowerCase() && p.status);
  if (!u || u.password !== password) {
    throw new ApiError("KREDENSIAL", "Username atau password salah. Periksa lagi, lalu coba masuk.");
  }
  try {
    localStorage.setItem(KUNCI_SESI, JSON.stringify({ idUser: u.id }));
  } catch (_) {}
  return publikPengguna(u);
}

export async function logout() {
  try {
    localStorage.removeItem(KUNCI_SESI);
  } catch (_) {}
}

export function akunContoh() {
  muat();
  return db.pengguna.map((u) => ({ username: u.username, nama: u.nama, role: u.role, idCabang: u.idCabang }));
}

export async function pulihkanDataContoh() {
  await tunda();
  db = buatSeed();
  simpan();
}

/* ---------- Bantuan internal ---------- */

const kategoriNama = (id) => db.kategori.find((k) => k.id === id)?.nama ?? "Lainnya";
const bukuDariKode = (kode) => db.buku.find((b) => b.kode.toLowerCase() === String(kode).toLowerCase());
const barisStok = (idBuku, idCabang) => db.stok.find((s) => s.idBuku === idBuku && s.idCabang === idCabang);
const namaPengguna = (id) => db.pengguna.find((u) => u.id === id)?.nama ?? "Tidak dikenal";

function lihatBuku(b) {
  const stok = [1, 2, 3].map((c) => barisStok(b.id, c)?.jumlah ?? 0);
  return {
    kode: b.kode, judul: b.judul, pengarang: b.pengarang, penerbit: b.penerbit,
    kategori: kategoriNama(b.idKategori), tahun: b.tahun, harga: b.harga,
    min: b.stokMinimum, sampul: b.sampul || null, stok,
  };
}

function lihatRiwayat(r) {
  const s = db.stok.find((x) => x.id === r.idStok);
  const b = db.buku.find((x) => x.id === s.idBuku);
  return {
    id: r.id, tanggal: r.tanggal, idUser: r.idUser, staff: namaPengguna(r.idUser), cabang: s.idCabang,
    kode: b.kode, judul: b.judul, jenis: r.jenis, jumlah: r.jumlah, sebelum: r.sebelum, sesudah: r.sesudah,
    keterangan: r.keterangan || "",
  };
}

export const menipis = (b, i) => b.stok[i] < b.min;
export const adaMenipis = (b) => b.stok.some((_, i) => menipis(b, i));

function cocokKataKunci(b, q) {
  if (!q) return true;
  q = q.trim().toLowerCase();
  return [b.kode, b.judul, b.pengarang, b.penerbit].some((v) => String(v).toLowerCase().includes(q));
}

function potong(items, hal, per) {
  const total = items.length;
  const totalHalaman = Math.max(1, Math.ceil(total / per));
  const h = Math.min(Math.max(1, hal || 1), totalHalaman);
  return { items: items.slice((h - 1) * per, h * per), total, halaman: h, totalHalaman, per };
}

function terjualPerBuku({ idCabang = null, hari = 30 } = {}) {
  const batas = Date.now() - hari * HARI;
  const peta = new Map();
  for (const r of db.riwayat) {
    if (r.jenis !== "kurang" || new Date(r.tanggal).getTime() < batas) continue;
    const s = db.stok.find((x) => x.id === r.idStok);
    if (idCabang && s.idCabang !== idCabang) continue;
    peta.set(s.idBuku, (peta.get(s.idBuku) || 0) + Math.abs(r.jumlah));
  }
  return peta;
}

// Jumlah eksemplar terjual per hari (lama -> baru), untuk grafik mini dashboard.
function trenHarian(idCabang = null, hari = 14) {
  const awal = new Date();
  awal.setHours(0, 0, 0, 0);
  const mulai = awal.getTime() - (hari - 1) * HARI;
  const isi = Array(hari).fill(0);
  for (const r of db.riwayat) {
    if (r.jenis !== "kurang") continue;
    const t = new Date(r.tanggal).getTime();
    if (t < mulai) continue;
    if (idCabang && db.stok.find((x) => x.id === r.idStok).idCabang !== idCabang) continue;
    const i = Math.min(hari - 1, Math.floor((t - mulai) / HARI));
    isi[i] += Math.abs(r.jumlah);
  }
  return isi;
}

/* ---------- Referensi ---------- */

export async function getKategori() {
  await jaringan("getKategori");
  return db.kategori.map((k) => k.nama).sort((a, b) => a.localeCompare(b, "id"));
}

export async function getStaff() {
  await jaringan("getStaff");
  wajibManager();
  return db.pengguna.map((u) => ({ id: u.id, nama: u.nama, role: u.role, idCabang: u.idCabang }));
}

/* ---------- Buku & stok ---------- */

// Publik: dipakai juga oleh mode cek stok tanpa login.
export async function getBuku({ q = "", kategori = "", status = "", cabang = null, hal = 1, per = 10, urut = "judul" } = {}) {
  await jaringan("getBuku");
  const ci = cabang ? Number(cabang) - 1 : null;
  let items = db.buku.filter((b) => b.status).map(lihatBuku).filter((b) => cocokKataKunci(b, q));
  if (kategori) items = items.filter((b) => b.kategori === kategori);
  if (status === "menipis") items = items.filter((b) => (ci !== null ? menipis(b, ci) : adaMenipis(b)));
  if (status === "kosong") items = items.filter((b) => (ci !== null ? b.stok[ci] === 0 : b.stok.some((n) => n === 0)));
  if (urut === "kode") items.sort((a, b) => a.kode.localeCompare(b.kode));
  else items.sort((a, b) => a.judul.localeCompare(b.judul, "id"));
  return { ...potong(items, hal, per), semua: db.buku.filter((b) => b.status).length };
}

export async function getBukuDetail(kode) {
  await jaringan("getBukuDetail");
  const b = bukuDariKode(kode);
  if (!b) throw new ApiError("TIDAK_ADA", `Buku dengan kode ${kode} tidak ditemukan.`);
  return lihatBuku(b);
}

export async function getTerlaris({ cabang = null, hari = 30, batas = 5 } = {}) {
  await jaringan("getTerlaris");
  const peta = terjualPerBuku({ idCabang: cabang ? Number(cabang) : null, hari });
  return [...peta.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, batas)
    .map(([idBuku, terjual]) => ({ ...lihatBuku(db.buku.find((b) => b.id === idBuku)), terjual }));
}

export async function kodeTersedia(kode) {
  await tunda();
  muat();
  return !bukuDariKode(kode);
}

/* ---------- Ubah stok (Stok.updateJumlah + RiwayatStok.catatPerubahan + cekStokMinimum) ---------- */

export async function ubahStok({ kode, cabang, jenis, jumlah, keterangan = "" }) {
  await jaringan("ubahStok");
  const u = wajibLogin();
  const idCabang = Number(cabang);
  if (u.role === "staff" && u.idCabang !== idCabang) {
    throw new ApiError("AKSES", "Staff hanya bisa mengubah stok cabangnya sendiri.");
  }
  const b = bukuDariKode(kode);
  if (!b) throw new ApiError("TIDAK_ADA", `Buku dengan kode ${kode} tidak ditemukan.`);
  const s = barisStok(b.id, idCabang);
  const n = Number(jumlah);
  if (!Number.isInteger(n)) throw new ApiError("VALIDASI", "Isi jumlah dengan angka bulat.", "jumlah");

  let sesudah;
  if (jenis === "tambah") {
    if (n < 1) throw new ApiError("VALIDASI", "Jumlah yang ditambah minimal 1.", "jumlah");
    sesudah = s.jumlah + n;
  } else if (jenis === "kurang") {
    if (n < 1) throw new ApiError("VALIDASI", "Jumlah yang dikurangi minimal 1.", "jumlah");
    if (n > s.jumlah) {
      throw new ApiError("VALIDASI", `Stok Cabang ${idCabang} tinggal ${s.jumlah}. Jumlah yang dikurangi tidak boleh lebih dari ${s.jumlah}.`, "jumlah");
    }
    sesudah = s.jumlah - n;
  } else if (jenis === "koreksi") {
    if (n < 0) throw new ApiError("VALIDASI", "Jumlah hasil hitung tidak boleh negatif.", "jumlah");
    if (n === s.jumlah) throw new ApiError("VALIDASI", "Jumlahnya sama dengan stok sekarang, tidak ada yang diubah.", "jumlah");
    sesudah = n;
  } else {
    throw new ApiError("VALIDASI", "Pilih jenis perubahan.", "jenis");
  }

  const sebelum = s.jumlah;
  s.jumlah = sesudah;
  s.tanggalUpdate = new Date().toISOString();
  const r = {
    id: db.idBerikut.riwayat++, idStok: s.id, idUser: u.id, jenis, jumlah: sesudah - sebelum,
    sebelum, sesudah, tanggal: s.tanggalUpdate, keterangan: String(keterangan).trim().slice(0, 140),
  };
  db.riwayat.push(r);

  let notif = null;
  if (sesudah < b.stokMinimum) {
    notif = {
      id: db.idBerikut.notifikasi++, idStok: s.id, idRiwayat: r.id,
      pesan: `Stok ${b.judul} di Cabang ${idCabang} tinggal ${sesudah} (batas minimum ${b.stokMinimum}).`,
      tanggal: r.tanggal, statusKirim: true,
    };
    db.notifikasi.push(notif);
  }
  simpan();
  return { buku: lihatBuku(b), riwayat: lihatRiwayat(r), notifikasi: notif ? { ...notif } : null };
}

// Batalkan perubahan terakhir (dipakai tombol "Batalkan" di toast).
export async function batalkanPerubahan(idRiwayat) {
  await jaringan("batalkanPerubahan");
  wajibLogin();
  const r = db.riwayat.find((x) => x.id === idRiwayat);
  if (!r) throw new ApiError("TIDAK_ADA", "Perubahan ini sudah tidak bisa dibatalkan.");
  const terakhir = db.riwayat.filter((x) => x.idStok === r.idStok).at(-1);
  if (terakhir.id !== r.id) throw new ApiError("KONFLIK", "Sudah ada perubahan lain setelah ini, jadi tidak bisa dibatalkan.");
  const s = db.stok.find((x) => x.id === r.idStok);
  s.jumlah = r.sebelum;
  db.riwayat = db.riwayat.filter((x) => x.id !== r.id);
  db.notifikasi = db.notifikasi.filter((n) => n.idRiwayat !== r.id);
  if (r.jenis === "judul_baru") {
    const b = db.buku.find((x) => x.id === s.idBuku);
    db.stok = db.stok.filter((x) => x.idBuku !== b.id);
    db.buku = db.buku.filter((x) => x.id !== b.id);
    simpan();
    return null;
  }
  simpan();
  return lihatBuku(db.buku.find((x) => x.id === s.idBuku));
}

/* ---------- Judul baru (Buku.tambahBuku) ---------- */

export async function tambahJudul(data) {
  await jaringan("tambahJudul");
  const u = wajibLogin();
  const galat = validasiJudul(data);
  if (galat) throw new ApiError("VALIDASI", galat.pesan, galat.field);
  const idCabang = Number(data.cabang);
  if (u.role === "staff" && u.idCabang !== idCabang) throw new ApiError("AKSES", "Staff hanya bisa menambah stok awal ke cabangnya sendiri.");

  let kat = db.kategori.find((k) => k.nama === data.kategori);
  if (!kat) {
    kat = { id: db.idBerikut.kategori++, nama: data.kategori, deskripsi: "" };
    db.kategori.push(kat);
  }
  const b = {
    id: db.idBerikut.buku++, kode: data.kode.trim().toUpperCase(), judul: data.judul.trim(), pengarang: data.pengarang.trim(),
    penerbit: data.penerbit.trim(), tahun: Number(data.tahun), harga: Number(data.harga), stokMinimum: Number(data.min),
    sampul: data.sampul || null, idKategori: kat.id, status: true,
  };
  db.buku.push(b);
  const waktu = new Date().toISOString();
  let idStokTujuan = null;
  [1, 2, 3].forEach((c) => {
    const jumlah = c === idCabang ? Number(data.stokAwal) : 0;
    const s = { id: db.idBerikut.stok++, idBuku: b.id, idCabang: c, jumlah, tanggalUpdate: waktu };
    db.stok.push(s);
    if (c === idCabang) idStokTujuan = s.id;
  });
  const r = {
    id: db.idBerikut.riwayat++, idStok: idStokTujuan, idUser: u.id, jenis: "judul_baru", jumlah: Number(data.stokAwal),
    sebelum: 0, sesudah: Number(data.stokAwal), tanggal: waktu, keterangan: "Stok awal judul baru",
  };
  db.riwayat.push(r);
  simpan();
  return { buku: lihatBuku(b), riwayat: lihatRiwayat(r) };
}

export function validasiJudul(d) {
  muat();
  const t = (v) => String(v ?? "").trim();
  if (!t(d.kode)) return { field: "kode", pesan: "Isi kode buku atau ISBN." };
  if (!/^[A-Za-z0-9-]{3,20}$/.test(t(d.kode))) return { field: "kode", pesan: "Kode hanya boleh huruf, angka, dan tanda hubung (3–20 karakter)." };
  if (db && bukuDariKode(t(d.kode))) return { field: "kode", pesan: `Kode ${t(d.kode).toUpperCase()} sudah dipakai buku lain.` };
  if (!t(d.kategori)) return { field: "kategori", pesan: "Pilih kategori." };
  if (!t(d.judul)) return { field: "judul", pesan: "Isi judul buku." };
  if (!t(d.pengarang)) return { field: "pengarang", pesan: "Isi nama pengarang." };
  if (!t(d.penerbit)) return { field: "penerbit", pesan: "Isi nama penerbit." };
  const harga = Number(d.harga);
  if (!t(d.harga) || !Number.isFinite(harga) || harga <= 0) return { field: "harga", pesan: "Isi harga lebih dari Rp 0." };
  const tahun = Number(d.tahun);
  const kini = new Date().getFullYear();
  if (!Number.isInteger(tahun) || tahun < 1900 || tahun > kini + 1) return { field: "tahun", pesan: `Tahun terbit antara 1900 dan ${kini + 1}.` };
  const stok = Number(d.stokAwal);
  if (!Number.isInteger(stok) || stok < 0) return { field: "stokAwal", pesan: "Stok awal tidak boleh negatif." };
  const min = Number(d.min);
  if (!Number.isInteger(min) || min < 0) return { field: "min", pesan: "Batas minimum tidak boleh negatif." };
  return null;
}

/* ---------- Riwayat & laporan (Manager) ---------- */

function saringRiwayat({ cabang, dari, sampai, staff, jenis, q, kode } = {}) {
  const tDari = dari ? new Date(dari + "T00:00:00").getTime() : null;
  const tSampai = sampai ? new Date(sampai + "T23:59:59").getTime() : null;
  return db.riwayat
    .map(lihatRiwayat)
    .filter((r) => {
      const t = new Date(r.tanggal).getTime();
      if (cabang && r.cabang !== Number(cabang)) return false;
      if (staff && r.idUser !== Number(staff)) return false;
      if (jenis && r.jenis !== jenis) return false;
      if (kode && r.kode !== kode) return false;
      if (tDari && t < tDari) return false;
      if (tSampai && t > tSampai) return false;
      if (q) {
        const k = q.trim().toLowerCase();
        if (![r.kode, r.judul, r.keterangan].some((v) => v.toLowerCase().includes(k))) return false;
      }
      return true;
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);
}

export async function getRiwayat({ hal = 1, per = 15, ...saring } = {}) {
  await jaringan("getRiwayat");
  wajibManager();
  const semua = saringRiwayat(saring);
  const ringkas = { tambah: 0, kurang: 0, koreksi: 0, judul_baru: 0 };
  semua.forEach((r) => (ringkas[r.jenis] += 1));
  return { ...potong(semua, hal, per), ringkas };
}

// Riwayat satu buku (dipakai layar Ubah jumlah stok; boleh untuk Staff).
export async function getRiwayatBuku(kode, cabang, batas = 8) {
  await jaringan("getRiwayatBuku");
  wajibLogin();
  return saringRiwayat({ kode, cabang }).slice(0, batas);
}

// Laporan.generateLaporan(): CSV sesuai filter aktif.
export async function eksporRiwayat(saring = {}) {
  await jaringan("eksporRiwayat");
  wajibManager();
  const baris = saringRiwayat(saring);
  const aman = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const label = { tambah: "Tambah", kurang: "Kurang", koreksi: "Koreksi jumlah", judul_baru: "Judul baru" };
  const kepala = ["tanggal", "waktu", "staff", "cabang", "kode", "judul", "jenis", "jumlah", "stok_sebelum", "stok_sesudah", "keterangan"];
  const isi = baris.map((r) => {
    const d = new Date(r.tanggal);
    const pad = (x) => String(x).padStart(2, "0");
    return [
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      aman(r.staff), r.cabang, aman(r.kode), aman(r.judul), aman(label[r.jenis]), r.jumlah, r.sebelum, r.sesudah, aman(r.keterangan),
    ].join(",");
  });
  return { csv: "﻿" + [kepala.join(","), ...isi].join("\r\n"), jumlah: baris.length };
}

/* ---------- Dashboard (kelas boundary Dashboard) ---------- */

export async function getDashboardStaff() {
  await jaringan("getDashboardStaff");
  const u = wajibLogin();
  const c = u.idCabang;
  const semua = db.buku.filter((b) => b.status).map(lihatBuku);
  const terjualPeta = terjualPerBuku({ idCabang: c, hari: 30 });
  const menipisList = semua.filter((b) => menipis(b, c - 1)).sort((a, b) => a.stok[c - 1] - b.stok[c - 1]);
  const terlaris = [...terjualPeta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, terjual]) => ({ ...lihatBuku(db.buku.find((b) => b.id === id)), terjual }));
  return {
    cabang: c,
    totalJudul: semua.length,
    judulTersedia: semua.filter((b) => b.stok[c - 1] > 0).length,
    eksemplar: semua.reduce((t, b) => t + b.stok[c - 1], 0),
    menipis: menipisList,
    terjual30: [...terjualPeta.values()].reduce((a, b) => a + b, 0),
    tren: trenHarian(c, 14),
    terlaris,
  };
}

export async function getDashboardManager() {
  await jaringan("getDashboardManager");
  wajibManager();
  const semua = db.buku.filter((b) => b.status).map(lihatBuku);
  const perCabang = [1, 2, 3].map((c) => ({
    cabang: c,
    judulTersedia: semua.filter((b) => b.stok[c - 1] > 0).length,
    eksemplar: semua.reduce((t, b) => t + b.stok[c - 1], 0),
    menipis: semua.filter((b) => menipis(b, c - 1)).length,
    kosong: semua.filter((b) => b.stok[c - 1] === 0).length,
    terjual30: [...terjualPeta(c).values()].reduce((a, b) => a + b, 0),
    tren: trenHarian(c, 14),
  }));
  function terjualPeta(c) {
    return terjualPerBuku({ idCabang: c, hari: 30 });
  }
  const aktivitas = [...db.riwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 7).map(lihatRiwayat);
  const menipisSemua = [];
  semua.forEach((b) => b.stok.forEach((n, i) => {
    if (n < b.min) {
      const s = barisStok(db.buku.find((x) => x.kode === b.kode).id, i + 1);
      const notif = db.notifikasi.filter((x) => x.idStok === s.id).at(-1) || null;
      menipisSemua.push({ kode: b.kode, judul: b.judul, cabang: i + 1, stok: n, min: b.min, notifikasi: notif });
    }
  }));
  menipisSemua.sort((a, b) => a.stok - b.stok || a.judul.localeCompare(b.judul, "id"));
  return { totalJudul: semua.length, perCabang, aktivitas, menipis: menipisSemua };
}
