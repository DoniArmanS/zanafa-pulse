import { html, pasang, bertanda } from "../util.js";

export const LABEL_JENIS = { tambah: "Tambah", kurang: "Kurang", koreksi: "Koreksi jumlah", judul_baru: "Judul baru" };

export function jumlahRiwayat(r) {
  if (r.jenis === "judul_baru") return `stok awal ${r.jumlah}`;
  return bertanda(r.jumlah);
}

// Kepala halaman: judul, satu baris konteks, aksi di kanan.
export function kepala({ judul, konteks = "", aksi = "", balik = null, id = "judulHalaman" }) {
  return html`<header class="kepala">
    <div class="kepala-teks">
      ${balik ? html`<a class="balik" href="${balik.href}">← ${balik.label}</a>` : ""}
      <h1 id="${id}" tabindex="-1">${judul}</h1>
      ${konteks ? html`<p class="konteks">${konteks}</p>` : ""}
    </div>
    ${aksi ? html`<div class="kepala-aksi">${aksi}</div>` : ""}
  </header>`;
}

export function setJudul(teks) {
  document.title = teks ? `${teks} — Zanafa Bookstore` : "Zanafa Bookstore";
}

export function halamanKhusus(ctx, jenis) {
  const isi = {
    "akses-ditolak": {
      judul: "Halaman ini khusus Manager",
      teks: "Riwayat dan laporan stok hanya bisa dibuka akun Manager. Minta Manager membukanya jika kamu butuh data ini.",
      aksi: html`<a class="btn utama" href="#/dashboard">Kembali ke dashboard</a>`,
    },
    "tidak-ditemukan": {
      judul: "Halaman tidak ditemukan",
      teks: "Alamat ini tidak ada di sistem. Mungkin tautannya salah ketik.",
      aksi: html`<a class="btn utama" href="${ctx.user ? "#/dashboard" : "#/login"}">${ctx.user ? "Kembali ke dashboard" : "Ke halaman masuk"}</a>`,
    },
  }[jenis];
  setJudul(isi.judul);
  pasang(ctx.root, html`<section class="khusus">
    <div class="khusus-rak" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => html`<span style="height:${30 + ((i * 11) % 18)}px"></span>`)}</div>
    <h1 tabindex="-1">${isi.judul}</h1>
    <p>${isi.teks}</p>
    ${isi.aksi}
  </section>`);
}

// Pasang ulang tombol "Coba lagi" di panel galat.
export function pasangCobaLagi(root, fn, id = "cobaLagi") {
  root.querySelector("#" + id)?.addEventListener("click", fn);
}
