// Routing berbasis hash: #/katalog?q=laut&hal=2
const RUTE = [
  { pola: /^\/login$/, halaman: "login", mode: "login", publik: true },
  { pola: /^\/publik$/, halaman: "cekstok", mode: "publik", publik: true },
  { pola: /^\/publik\/stok\/([^/]+)$/, halaman: "stok", mode: "publik", publik: true, kunci: ["kode"] },
  { pola: /^\/dashboard$/, halaman: "dashboard", menu: "dashboard" },
  { pola: /^\/katalog$/, halaman: "katalog", menu: "katalog" },
  { pola: /^\/cek-stok$/, halaman: "cekstok", menu: "cek-stok" },
  { pola: /^\/stok\/([^/]+)$/, halaman: "stok", menu: "cek-stok", kunci: ["kode"] },
  { pola: /^\/kelola$/, halaman: "kelola", menu: "kelola" },
  { pola: /^\/kelola\/([^/]+)$/, halaman: "ubah", menu: "kelola", kunci: ["kode"] },
  { pola: /^\/judul-baru$/, halaman: "judulbaru", menu: "kelola" },
  { pola: /^\/riwayat$/, halaman: "riwayat", menu: "riwayat", manager: true },
];

export function bacaHash() {
  const h = location.hash.startsWith("#/") ? location.hash.slice(1) : "/";
  const [path, qs = ""] = h.split("?");
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { path: decodeURI(path), query };
}

export function cocokkan(path) {
  for (const r of RUTE) {
    const m = path.match(r.pola);
    if (m) {
      const params = {};
      (r.kunci || []).forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { ...r, params };
    }
  }
  return null;
}

export function buatHash(path, query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false)).toString();
  return "#" + path + (qs ? "?" + qs : "");
}

export function pergi(path, query) {
  const h = buatHash(path, query);
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = h;
}

// Ubah query di URL tanpa memuat ulang halaman (untuk filter & halaman tabel).
export function gantiQuery(query) {
  const { path } = bacaHash();
  history.replaceState(null, "", buatHash(path, query));
}
