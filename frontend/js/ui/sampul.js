import { html, benih } from "../util.js";

const LATAR = ["var(--hijau-900)", "var(--hijau-700)", "var(--tinta)", "var(--hijau-800)"];

// Sampul asli bila ada; jika tidak, sampul buatan dari judul dan pengarang.
export function sampul(buku, ukuran = "sedang") {
  if (buku.sampul) {
    return html`<img class="sampul ${ukuran}" src="${buku.sampul}" alt="Sampul ${buku.judul}" loading="lazy">`;
  }
  const bg = LATAR[benih(buku.kode || buku.judul || "x") % LATAR.length];
  return html`<div class="sampul sampul-buatan ${ukuran}" style="--bg:${bg}" aria-hidden="true"><span class="sj">${buku.judul || "Judul buku"}</span><span class="sp">${buku.pengarang || ""}</span></div>`;
}
