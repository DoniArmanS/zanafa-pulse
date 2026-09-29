import { html, pasang, labelPengguna } from "../util.js";
import * as cari from "./cari.js";

const MENU = [
  { kunci: "dashboard", label: "Dashboard", href: "#/dashboard" },
  { kunci: "katalog", label: "Katalog", href: "#/katalog" },
  { kunci: "cek-stok", label: "Cek stok", href: "#/cek-stok" },
  { kunci: "kelola", label: "Kelola stok", href: "#/kelola" },
  { kunci: "riwayat", label: "Riwayat stok", href: "#/riwayat", manager: true },
];

let kunciShell = null;
let dengarUkuran = false;
let aktifSekarang = null;

const ikonCari = html`<svg class="ikon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>`;

export function renderShell({ user, mode, menu, onKeluar }) {
  const header = document.getElementById("navbar");
  const kunci = mode === "login" ? "login" : mode === "publik" ? "publik" : `u${user?.id}`;
  if (kunci !== kunciShell) {
    kunciShell = kunci;
    aktifSekarang = null;
    if (mode === "login") {
      header.hidden = true;
      header.innerHTML = "";
    } else {
      header.hidden = false;
      pasang(header, mode === "publik" ? navPublik() : navPengguna(user));
      header.querySelector("[data-cari]")?.addEventListener("click", () => cari.buka());
      header.querySelectorAll("[data-keluar]").forEach((b) => b.addEventListener("click", onKeluar));
      const burger = header.querySelector(".burger");
      burger?.addEventListener("click", () => {
        const laci = header.querySelector(".laci");
        const buka = laci.hidden;
        laci.hidden = !buka;
        burger.setAttribute("aria-expanded", String(buka));
      });
      header.querySelector(".laci")?.addEventListener("click", (e) => {
        if (e.target.closest("a")) tutupLaci();
      });
      if (!dengarUkuran) {
        dengarUkuran = true;
        window.addEventListener("resize", aturGaris);
      }
      document.fonts?.ready.then(aturGaris);
    }
  }
  setAktif(menu);
}

function tutupLaci() {
  const header = document.getElementById("navbar");
  const laci = header.querySelector(".laci");
  if (laci && !laci.hidden) {
    laci.hidden = true;
    header.querySelector(".burger")?.setAttribute("aria-expanded", "false");
  }
}

function navPengguna(user) {
  const menu = MENU.filter((m) => !m.manager || user.role === "manager");
  return html`<div class="nav">
    <div class="nav-in">
      <a class="brand" href="#/dashboard"><span class="logo" aria-hidden="true"></span>Zanafa Bookstore</a>
      <nav class="menu" aria-label="Menu utama">
        ${menu.map((m) => html`<a href="${m.href}" data-menu="${m.kunci}">${m.label}</a>`)}
        <span class="garis" aria-hidden="true"></span>
      </nav>
      <div class="nav-kanan">
        <button class="cari-btn" type="button" data-cari aria-keyshortcuts="/">${ikonCari}<span>Cari buku</span><kbd>/</kbd></button>
        <div class="pengguna"><b>${user.nama}</b><span>${labelPengguna(user)}</span></div>
        <button class="keluar" type="button" data-keluar>Keluar</button>
        <button class="burger" type="button" aria-expanded="false" aria-controls="laci" aria-label="Buka menu"><span></span></button>
      </div>
    </div>
    <div class="laci" id="laci" hidden>
      ${menu.map((m) => html`<a href="${m.href}" data-menu="${m.kunci}">${m.label}</a>`)}
      <div class="laci-kaki"><span><b>${user.nama}</b>, ${labelPengguna(user)}</span><button class="keluar" type="button" data-keluar>Keluar</button></div>
    </div>
  </div>`;
}

function navPublik() {
  return html`<div class="nav">
    <div class="nav-in">
      <a class="brand" href="#/publik"><span class="logo" aria-hidden="true"></span>Zanafa Bookstore</a>
      <span class="nav-mode">Cek stok tanpa login</span>
      <div class="nav-kanan">
        <button class="cari-btn" type="button" data-cari aria-keyshortcuts="/">${ikonCari}<span>Cari buku</span><kbd>/</kbd></button>
        <a class="btn masuk" href="#/login">Masuk</a>
      </div>
    </div>
  </div>`;
}

function setAktif(menu) {
  aktifSekarang = menu;
  document.querySelectorAll("#navbar [data-menu]").forEach((a) => {
    if (a.dataset.menu === menu) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  tutupLaci();
  aturGaris();
}

function aturGaris() {
  const nav = document.querySelector("#navbar .menu");
  if (!nav) return;
  const garis = nav.querySelector(".garis");
  const a = nav.querySelector('[aria-current="page"]');
  if (!a || !a.offsetWidth) {
    garis.style.width = "0px";
    return;
  }
  garis.style.width = a.offsetWidth - 24 + "px";
  garis.style.transform = `translateX(${a.offsetLeft + 12}px)`;
}
