// Pengganti frontend/js/api.js: nama dan bentuk hasil fungsinya sama, datanya dari fetch("/api/...").
// Cara memasangnya ada di README.md folder ini.

const KUNCI_UJI_GAGAL = "zanafa-uji-gagal";
const DASAR = "/api";

export class ApiError extends Error {
  constructor(kode, pesan, field) {
    super(pesan);
    this.kode = kode;
    this.field = field;
  }
}

/* ---------- Pemanggil server ---------- */

// uji keadaan error seperti prototipe: sessionStorage["zanafa-uji-gagal"] = nama fungsi atau "*"
function ujiGagal(nama) {
  let gagal = false;
  try {
    const t = sessionStorage.getItem(KUNCI_UJI_GAGAL);
    gagal = !!nama && !!t && (t === nama || t === "*");
    if (gagal) sessionStorage.removeItem(KUNCI_UJI_GAGAL);
  } catch (_) {}
  if (gagal) throw new ApiError("JARINGAN", "Server tidak menjawab.");
}

// nilai kosong tidak ikut dikirim
function susunQuery(query = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== "" && v !== null && v !== undefined) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? "?" + s : "";
}

async function panggil(nama, metode, jalur, { query, body, mentah = false } = {}) {
  ujiGagal(nama);
  let res;
  try {
    res = await fetch(DASAR + jalur + susunQuery(query), {
      method: metode,
      credentials: "same-origin", // cookie sesi ikut terkirim
      // X-Requested-With diwajibkan backend untuk permintaan tanpa isi (logout, batalkan)
      headers: { Accept: "application/json", "X-Requested-With": "fetch", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (_) {
    throw new ApiError("JARINGAN", "Server tidak menjawab.");
  }

  if (res.ok) {
    if (mentah) return res;
    return res.status === 204 ? null : res.json();
  }

  let galat = {};
  try {
    galat = await res.json();
  } catch (_) {}
  if (galat.kode === "SESI") pengguna = null; // sesi habis: anggap sudah keluar
  throw new ApiError(galat.kode || "SERVER", galat.pesan || "Server sedang bermasalah.", galat.field);
}

/* ---------- Sesi ---------- */

// sesiSaatIni() dipanggil tanpa await, jadi sesi ditanyakan sekali saat aplikasi dibuka lalu diingat
let pengguna = null;
try {
  pengguna = await panggil("", "GET", "/auth/saya");
} catch (_) {
  pengguna = null;
}

// Blok "Akun contoh untuk mencoba prototipe" di halaman masuk hanya berlaku untuk data di browser.
if (typeof document !== "undefined") {
  const gaya = document.createElement("style");
  gaya.textContent = ".akun-contoh{display:none}";
  document.head.append(gaya);
}

export function sesiSaatIni() {
  return pengguna;
}

export async function login(username, password) {
  // tidak ada yang disimpan di sini: server memasang cookie httpOnly
  pengguna = await panggil("login", "POST", "/auth/login", { body: { username, password } });
  return pengguna;
}

export async function logout() {
  try {
    await panggil("", "POST", "/auth/logout");
  } catch (_) {
    /* tetap dianggap keluar walaupun server tidak menjawab */
  }
  pengguna = null;
}

export function akunContoh() {
  return [];
}

export async function pulihkanDataContoh() {
  throw new ApiError("AKSES", "Data di server tidak bisa dipulihkan dari halaman ini.");
}

/* ---------- Bantuan (dihitung di browser, tidak memanggil server) ---------- */

export const menipis = (b, i) => b.stok[i] < b.min;
export const adaMenipis = (b) => b.stok.some((_, i) => menipis(b, i));

/* ---------- Referensi ---------- */

export function getKategori() {
  return panggil("getKategori", "GET", "/kategori");
}

export function getStaff() {
  return panggil("getStaff", "GET", "/pengguna");
}

/* ---------- Buku & stok ---------- */

export function getBuku({ q = "", kategori = "", status = "", cabang = null, hal = 1, per = 10, urut = "judul" } = {}) {
  return panggil("getBuku", "GET", "/buku", { query: { q: q.trim(), kategori, status, cabang, hal, per, urut } });
}

export function getBukuDetail(kode) {
  return panggil("getBukuDetail", "GET", `/buku/${encodeURIComponent(kode)}`);
}

export function getTerlaris({ cabang = null, hari = 30, batas = 5 } = {}) {
  return panggil("getTerlaris", "GET", "/buku/terlaris", { query: { cabang, hari, batas } });
}

// kode yang sudah diketahui terpakai, untuk validasiJudul() yang tidak bisa menunggu server
const kodeTerpakai = new Set();

export async function kodeTersedia(kode) {
  const k = String(kode).trim().toUpperCase();
  try {
    await panggil("", "GET", `/buku/${encodeURIComponent(k)}`);
    kodeTerpakai.add(k);
    return false;
  } catch (e) {
    if (e.kode === "TIDAK_ADA") return true;
    throw e;
  }
}

/* ---------- Ubah stok ---------- */

export function ubahStok({ kode, cabang, jenis, jumlah, keterangan = "" }) {
  return panggil("ubahStok", "POST", `/stok/${encodeURIComponent(kode)}/perubahan`, { body: { cabang, jenis, jumlah, keterangan } });
}

export function batalkanPerubahan(idRiwayat) {
  return panggil("batalkanPerubahan", "DELETE", `/riwayat/${encodeURIComponent(idRiwayat)}`);
}

/* ---------- Judul baru ---------- */

export async function tambahJudul(data) {
  try {
    return await panggil("tambahJudul", "POST", "/buku", { body: data });
  } catch (e) {
    if (e.field === "kode") kodeTerpakai.add(String(data.kode).trim().toUpperCase());
    throw e;
  }
}

export function validasiJudul(d) {
  const t = (v) => String(v ?? "").trim();
  if (!t(d.kode)) return { field: "kode", pesan: "Isi kode buku atau ISBN." };
  if (!/^[A-Za-z0-9-]{3,20}$/.test(t(d.kode))) return { field: "kode", pesan: "Kode hanya boleh huruf, angka, dan tanda hubung (3–20 karakter)." };
  const kode = t(d.kode).toUpperCase();
  if (kodeTerpakai.has(kode)) return { field: "kode", pesan: `Kode ${kode} sudah dipakai buku lain.` };
  // cek ke server di latar belakang, dipakai pada pemeriksaan berikutnya
  kodeTersedia(kode).catch(() => {});
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

export function getRiwayat({ hal = 1, per = 15, ...saring } = {}) {
  return panggil("getRiwayat", "GET", "/riwayat", { query: { ...saring, hal, per } });
}

export async function getRiwayatBuku(kode, cabang, batas = 8) {
  const r = await panggil("getRiwayatBuku", "GET", "/riwayat", { query: { kode, cabang, per: batas } });
  return r.items;
}

export async function eksporRiwayat(saring = {}) {
  const res = await panggil("eksporRiwayat", "GET", "/laporan/riwayat.csv", { query: saring, mentah: true });
  let csv = await res.text();
  // BOM hilang saat teks dibaca browser, dipasang lagi untuk Excel
  if (!csv.startsWith("\uFEFF")) csv = "\uFEFF" + csv;
  const dariHeader = Number(res.headers.get("X-Jumlah-Baris"));
  const jumlah = Number.isInteger(dariHeader) && res.headers.has("X-Jumlah-Baris") ? dariHeader : Math.max(0, csv.split("\r\n").length - 1);
  return { csv, jumlah };
}

/* ---------- Dashboard ---------- */

export function getDashboardStaff() {
  return panggil("getDashboardStaff", "GET", "/dashboard/staff");
}

export function getDashboardManager() {
  return panggil("getDashboardManager", "GET", "/dashboard/manager");
}
