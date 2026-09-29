import { html, raw, benih } from "../util.js";

const MAKS = 24;
const WARNA = ["var(--hijau-700)", "var(--hijau-900)", "var(--kuning-500)", "var(--tinta-2)", "var(--hijau-800)", "var(--hijau-700)", "var(--tinta)"];

export function labelRak(n, min, cabang) {
  const kurang = min - n;
  const dasar = `${n} buku di Cabang ${cabang}, batas minimum ${min}`;
  return kurang > 0 ? `${dasar}. Kurang ${kurang} lagi untuk mencapai batas minimum.` : `${dasar}.`;
}

// Rak lengkap. `pratinjau` (opsional) = jumlah setelah perubahan, untuk layar Ubah jumlah stok.
export function rak({ kode, n, min, cabang, animasi = true, pratinjau = null }) {
  const s = benih(kode) + cabang * 7;
  const akhir = pratinjau ?? n;
  const low = akhir < min;
  const tampil = Math.min(Math.max(n, akhir), MAKS);
  let isi = "";
  for (let k = 0; k < tampil; k++) {
    const tinggi = 34 + ((k * 7 + s) % 13);
    const warna = low ? (k % 2 ? "var(--merah-600)" : "var(--merah-700)") : WARNA[(k + s) % WARNA.length];
    let kelas = "punggung";
    if (pratinjau !== null && k >= n) kelas += " baru";
    if (pratinjau !== null && k >= akhir) kelas += " keluar";
    isi += `<span class="${kelas}" style="--i:${k};--w:${warna};height:${tinggi}px"></span>`;
  }
  if (Math.max(n, akhir) > MAKS) isi += `<span class="lebih">+${Math.max(n, akhir) - MAKS}</span>`;
  for (let j = Math.max(akhir, tampil); j < min && j < MAKS; j++) isi += `<span class="slot"></span>`;
  if (akhir === 0 && min === 0) isi += `<span class="rak-kosong">Kosong</span>`;
  const x = Math.min(min, MAKS) * 12 - 2;
  const label = labelRak(akhir, min, cabang);
  return html`<div class="rak${animasi ? " tumbuh" : ""}" role="img" aria-label="${label}" title="${label}">${raw(isi)}${
    min > 0 ? html`<span class="batas" style="left:${x}px" aria-hidden="true"><span>min ${min}</span></span>` : ""
  }</div>`;
}

export function statusStok(n, min) {
  if (n === 0) return html`<span class="badge kosong">Kosong</span>`;
  if (n < min) return html`<span class="badge menipis">Menipis</span>`;
  return html`<span class="status-aman">Aman</span>`;
}

// Rak mini: tiga batang C1/C2/C3.
export function rakMini(buku, { sorotCabang = null, skala = 20 } = {}) {
  return html`<div class="mini" role="img" aria-label="${buku.stok.map((n, i) => `Cabang ${i + 1}: ${n}`).join(", ")}">${buku.stok.map((n, i) => {
    const low = n < buku.min;
    const w = Math.min(n / skala, 1);
    return html`<span class="c${sorotCabang === i + 1 ? " kamu-c" : ""}">C${i + 1}</span><span class="bar${low ? " menipis" : ""}"><i style="transform:scaleX(${w})"></i></span><span class="n${low ? " menipis" : ""}">${n}</span>`;
  })}</div>`;
}

export function rakKerangka() {
  return html`<div class="kerangka" style="width:40%;height:44px"></div><div class="kerangka" style="width:85%;height:50px"></div>`;
}
