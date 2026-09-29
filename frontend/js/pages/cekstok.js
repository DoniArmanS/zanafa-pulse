import * as api from "../api.js";
import { html, pasang, rupiah, sorot, debounce, $ } from "../util.js";
import { kepala, setJudul, pasangCobaLagi } from "./bersama.js";
import { rakMini, statusStok } from "../ui/rak.js";
import { sampul } from "../ui/sampul.js";
import { panelGalat } from "../ui/kontrol.js";

export default async function cekstok(ctx) {
  const publik = ctx.mode === "publik";
  const c = !publik && ctx.user?.role === "staff" ? ctx.user.idCabang : null;
  const dasar = publik ? "/publik/stok/" : "/stok/";
  const s = { q: ctx.query.q || "", kategori: ctx.query.kategori || "" };
  setJudul("Cek stok");

  pasang(ctx.root, html`
    ${kepala({
      judul: "Cek ketersediaan buku",
      konteks: publik
        ? "Cari buku untuk melihat stoknya di tiga cabang Toko Buku Zanafa."
        : c
          ? `Cari judul, pengarang, penerbit, atau kode. Stok Cabang ${c} ditandai titik kuning.`
          : "Cari judul, pengarang, penerbit, atau kode untuk melihat stoknya di tiga cabang.",
    })}
    <section class="cek-cari" aria-label="Pencarian">
      <div class="field cari-field besar">
        <label class="sr" for="cariStok">Cari buku</label>
        <svg class="ikon ikon-input" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>
        <input class="input dengan-ikon" id="cariStok" type="text" placeholder="Contoh: Laut Bercerita, Tere Liye, atau BK-001" value="${s.q}" autocomplete="off" spellcheck="false">
      </div>
      <div class="field">
        <label class="sr" for="cekKategori">Kategori</label>
        <select class="input" id="cekKategori"><option value="">Semua kategori</option></select>
      </div>
    </section>
    <section id="hasilCek" aria-live="polite"></section>
    <section class="rekomendasi" aria-labelledby="hRek">
      <div class="panel-kepala">
        <h2 id="hRek">Rekomendasi untuk pelanggan</h2>
        <p class="sub">Buku terlaris 30 hari terakhir${c ? ` di Cabang ${c}` : " di tiga cabang"}.</p>
      </div>
      <div class="rek-grid" id="rekGrid">${Array.from({ length: 5 }, () => html`<div class="rek-kartu"><div class="kerangka sampul-kerangka"></div><div class="kerangka" style="width:80%"></div><div class="kerangka" style="width:50%"></div></div>`)}</div>
    </section>`);

  const input = $("#cariStok", ctx.root);
  const selKat = $("#cekKategori", ctx.root);
  const hasilEl = $("#hasilCek", ctx.root);
  let urutan = 0;

  api.getKategori().then((ks) => {
    if (ctx.aktif()) ks.forEach((k) => selKat.add(new Option(k, k, false, k === s.kategori)));
  }).catch(() => {});

  async function muatTerlaris() {
    try {
      const t = await api.getTerlaris({ cabang: c, batas: 5 });
      if (!ctx.aktif()) return;
      pasang($("#rekGrid", ctx.root), html`${t.map((b, i) => html`<a class="rek-kartu" href="#${dasar}${encodeURIComponent(b.kode)}" data-sorot>
        <span class="rek-urut">${i + 1}</span>
        ${sampul(b, "sedang")}
        <span class="judul-sel"><b>${b.judul}</b><span>${b.pengarang}</span></span>
        <span class="rek-kaki"><span>${b.terjual} terjual</span>${rakMini(b, { sorotCabang: c })}</span>
      </a>`)}`);
    } catch (e) {
      if (ctx.aktif()) pasang($("#rekGrid", ctx.root), html`<p class="kecil-muted">Rekomendasi belum bisa dimuat.</p>`);
    }
  }

  async function cari() {
    const nomor = ++urutan;
    ctx.gantiQuery({ q: s.q, kategori: s.kategori });
    if (!s.q.trim() && !s.kategori) {
      pasang(hasilEl, html`<p class="petunjuk">Ketik minimal satu kata untuk mencari. Dari layar mana pun, tekan <kbd>/</kbd> untuk langsung mencari.</p>`);
      return;
    }
    pasang(hasilEl, html`<div class="hasil-daftar">${Array.from({ length: 3 }, () => html`<div class="hasil-kartu memuat"><div class="kerangka sampul-kerangka kecil"></div><div style="flex:1;display:grid;gap:8px"><div class="kerangka" style="width:40%"></div><div class="kerangka" style="width:25%"></div></div></div>`)}</div>`);
    try {
      const r = await api.getBuku({ q: s.q, kategori: s.kategori, per: 8 });
      if (!ctx.aktif() || nomor !== urutan) return;
      if (!r.items.length) {
        pasang(hasilEl, html`<div class="keadaan"><p>Tidak ada buku yang cocok${s.q.trim() ? html` dengan “${s.q.trim()}”` : ""}. Periksa ejaan atau cari dengan kode buku.</p><button type="button" class="btn" id="hapusCari">Hapus pencarian</button></div>`);
        return;
      }
      pasang(hasilEl, html`<p class="jumlah-hasil"><b>${r.total}</b> buku ditemukan${r.total > r.items.length ? `, menampilkan ${r.items.length} teratas` : ""}.</p>
        <div class="hasil-daftar">${r.items.map((b) => html`<a class="hasil-kartu" href="#${dasar}${encodeURIComponent(b.kode)}" data-sorot>
          ${sampul(b, "kecil")}
          <span class="hasil-info">
            <b class="hasil-judul">${sorot(b.judul, s.q)}</b>
            <span class="kecil-muted">${sorot(b.pengarang, s.q)}, ${sorot(b.penerbit, s.q)}, ${b.tahun}. ${sorot(b.kode, s.q)}</span>
            <span class="hasil-harga">${rupiah(b.harga)}${c ? html`<span class="pemisah-titik"></span>Stok cabang ini <b class="angka${b.stok[c - 1] < b.min ? " merah" : ""}">${b.stok[c - 1]}</b> ${statusStok(b.stok[c - 1], b.min)}` : ""}</span>
          </span>
          <span class="hasil-stok">${rakMini(b, { sorotCabang: c })}<span class="lihat">Lihat stok tiga cabang</span></span>
        </a>`)}</div>`);
    } catch (e) {
      if (!ctx.aktif() || nomor !== urutan) return;
      pasang(hasilEl, panelGalat(e.message));
      pasangCobaLagi(ctx.root, cari);
    }
  }

  const cariTunda = debounce(cari, 120);
  input.addEventListener("input", () => { s.q = input.value; cariTunda(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) { input.value = ""; s.q = ""; cari(); e.stopPropagation(); }
    if (e.key === "Enter") { const a = hasilEl.querySelector("a.hasil-kartu"); if (a) location.hash = a.getAttribute("href"); }
  });
  selKat.addEventListener("change", () => { s.kategori = selKat.value; cari(); });
  ctx.root.addEventListener("click", (e) => {
    if (e.target.id === "hapusCari") { input.value = ""; selKat.value = ""; s.q = ""; s.kategori = ""; cari(); input.focus(); }
  });

  requestAnimationFrame(() => input.focus());
  await Promise.all([cari(), muatTerlaris()]);
}
