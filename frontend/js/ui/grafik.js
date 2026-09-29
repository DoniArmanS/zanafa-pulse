import { html } from "../util.js";

// Grafik mini (sparkline) penjualan harian. Titik terakhir ditekankan.
export function grafikMini(nilai, { lebar = 132, tinggi = 38, label = "Penjualan harian" } = {}) {
  const n = nilai.length;
  if (!n) return "";
  const maks = Math.max(1, ...nilai);
  const titik = nilai.map((v, i) => [2 + (i / (n - 1)) * (lebar - 6), tinggi - 4 - (v / maks) * (tinggi - 10)]);
  const d = titik.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${titik[n - 1][0].toFixed(1)} ${tinggi} L2 ${tinggi} Z`;
  const [x, y] = titik[n - 1];
  const total = nilai.reduce((a, b) => a + b, 0);
  return html`<svg class="grafik-mini" viewBox="0 0 ${lebar} ${tinggi}" width="${lebar}" height="${tinggi}" role="img" aria-label="${label}: ${total} eksemplar dalam ${n} hari, hari ini ${nilai[n - 1]}.">
    <path class="gm-area" d="${area}"/>
    <path class="gm-garis" d="${d}"/>
    <circle class="gm-titik" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>
  </svg>`;
}
