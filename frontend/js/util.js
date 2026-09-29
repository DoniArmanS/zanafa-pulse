// Escape otomatis: semua nilai yang disisipkan lewat html`` di-escape,
// kecuali sudah dibungkus raw() atau hasil html`` lain.
class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(String(s));

const PETA_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => PETA_ESC[c]);

function sisip(v) {
  if (v === null || v === undefined || v === false) return "";
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(sisip).join("");
  return esc(v);
}

export function html(strings, ...vals) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) out += sisip(vals[i]);
  });
  return new Raw(out);
}

export function pasang(el, konten) {
  el.innerHTML = String(konten);
  return el;
}

const fmtRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fmtAngka = new Intl.NumberFormat("id-ID");
const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const fmtJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

export const rupiah = (n) => fmtRupiah.format(n).replace(/ /g, " ");
export const angka = (n) => fmtAngka.format(n);
export const tanggal = (iso) => fmtTanggal.format(new Date(iso));
export const jam = (iso) => fmtJam.format(new Date(iso));
export const tanggalJam = (iso) => `${tanggal(iso)}, ${jam(iso)}`;

export function waktuRelatif(iso) {
  const menit = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const j = Math.round(menit / 60);
  if (j < 24) return `${j} jam lalu`;
  const h = Math.round(j / 24);
  if (h < 7) return `${h} hari lalu`;
  return tanggal(iso);
}

// Angka bertanda dengan minus tipografis.
export const bertanda = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function debounce(fn, ms = 120) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// Sorot bagian teks yang cocok dengan kata kunci (aman: tiap potongan di-escape).
export function sorot(teks, q) {
  teks = String(teks ?? "");
  q = (q || "").trim().toLowerCase();
  if (!q) return raw(esc(teks));
  const i = teks.toLowerCase().indexOf(q);
  if (i < 0) return raw(esc(teks));
  return raw(esc(teks.slice(0, i)) + "<mark>" + esc(teks.slice(i, i + q.length)) + "</mark>" + esc(teks.slice(i + q.length)));
}

export function benih(teks) {
  let h = 0;
  for (let i = 0; i < teks.length; i++) h = (h * 31 + teks.charCodeAt(i)) % 9973;
  return h;
}

export const kurangiGerak = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function hitungAngka(el, dari, ke, ms = 380) {
  if (!el) return;
  if (kurangiGerak() || dari === ke) {
    el.textContent = ke;
    return;
  }
  let mulai = null;
  const langkah = (t) => {
    if (!mulai) mulai = t;
    const p = Math.min((t - mulai) / ms, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(dari + (ke - dari) * e);
    if (p < 1) requestAnimationFrame(langkah);
  };
  requestAnimationFrame(langkah);
}

export function sorotSebentar(el) {
  if (!el) return;
  el.classList.remove("disorot");
  void el.offsetWidth;
  el.classList.add("disorot");
  setTimeout(() => el.classList.remove("disorot"), 1300);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const labelCabang = (id) => `Cabang ${id}`;
export const labelPengguna = (u) => (u.role === "manager" ? "Manager" : `Staff ${labelCabang(u.idCabang)}`);
