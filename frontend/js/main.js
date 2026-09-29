import * as api from "./api.js";
import { bacaHash, cocokkan, pergi, gantiQuery } from "./router.js";
import { renderShell } from "./ui/shell.js";
import * as cari from "./ui/cari.js";
import { tutup as tutupToast } from "./ui/toast.js";
import { halamanKhusus } from "./pages/bersama.js";
import { kurangiGerak, pasangSorotKursor } from "./ui/gerak.js";

import login from "./pages/login.js";
import dashboard from "./pages/dashboard.js";
import katalog from "./pages/katalog.js";
import cekstok from "./pages/cekstok.js";
import stok from "./pages/stok.js";
import kelola from "./pages/kelola.js";
import ubah from "./pages/ubah.js";
import judulbaru from "./pages/judulbaru.js";
import riwayat from "./pages/riwayat.js";

const HALAMAN = { login, dashboard, katalog, cekstok, stok, kelola, ubah, judulbaru, riwayat };

let token = 0;
let sudahTampil = false;
let modeSekarang = null;

async function keluar() {
  await api.logout();
  tutupToast();
  pergi("/login");
}

async function tampilkan() {
  if (location.hash && !location.hash.startsWith("#/")) return;
  const { path, query } = bacaHash();
  const user = api.sesiSaatIni();

  if (path === "/") return pergi(user ? "/dashboard" : "/login");
  const rute = cocokkan(path);
  if (rute?.halaman === "login" && user) return pergi("/dashboard");
  if (rute && !rute.publik && !user) return pergi("/login", { ke: location.hash.slice(1) });

  const mode = rute?.mode || (user ? "app" : "publik");
  modeSekarang = mode;
  cari.tutup(false);

  const main = document.getElementById("halaman");
  const root = document.createElement("div");
  root.className = "halaman-isi";
  const tukar = () => {
    renderShell({ user, mode, menu: rute?.menu || null, onKeluar: keluar });
    document.getElementById("latar").hidden = true;
    main.replaceChildren(root);
    main.classList.toggle("tanpa-nav", mode === "login");
    window.scrollTo(0, 0);
  };
  // Transisi halus antar halaman (View Transitions API). Cepat karena navigasi sering dilakukan.
  if (document.startViewTransition && sudahTampil && !kurangiGerak()) {
    await document.startViewTransition(tukar).updateCallbackDone.catch(() => {});
  } else {
    tukar();
  }
  sudahTampil = true;

  const nomor = ++token;
  const ctx = {
    root, query, user, mode,
    params: rute?.params || {},
    pergi,
    gantiQuery,
    aktif: () => nomor === token,
    sesiHabis: () => pergi("/login", { ke: location.hash.slice(1) }),
  };

  if (!rute) return halamanKhusus(ctx, "tidak-ditemukan");
  if (rute.manager && user.role !== "manager") return halamanKhusus(ctx, "akses-ditolak");
  try {
    await HALAMAN[rute.halaman](ctx);
  } catch (e) {
    if (e?.kode === "SESI") return ctx.sesiHabis();
    console.error(e);
  }
}

window.addEventListener("hashchange", tampilkan);
pasangSorotKursor();
cari.pasangPintasan((kode) => pergi(modeSekarang === "publik" ? `/publik/stok/${encodeURIComponent(kode)}` : `/stok/${encodeURIComponent(kode)}`));

document.getElementById("lewati").addEventListener("click", (e) => {
  e.preventDefault();
  const h1 = document.querySelector("#halaman h1");
  (h1 || document.getElementById("halaman")).focus();
});

tampilkan();
