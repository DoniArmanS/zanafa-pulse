import * as api from "../api.js";
import { html, pasang, rupiah, sorot, debounce, $ } from "../util.js";
import { kepala, setJudul, pasangCobaLagi } from "./bersama.js";
import { rakMini } from "../ui/rak.js";
import { paginasi, barisKerangka, panelGalat } from "../ui/kontrol.js";

export default async function katalog(ctx) {
  setJudul("Katalog");
  const s = { q: ctx.query.q || "", kategori: ctx.query.kategori || "", status: ctx.query.status || "", hal: Number(ctx.query.hal) || 1 };
  const cabangKamu = ctx.user.role === "staff" ? ctx.user.idCabang : null;

  pasang(ctx.root, html`
    ${kepala({
      judul: "Katalog buku",
      konteks: "Semua judul beserta stoknya di tiga cabang. Klik baris untuk melihat detail stok.",
      aksi: html`<a class="btn utama" href="#/judul-baru">Tambah judul baru</a>`,
    })}
    <section class="panel daftar-panel" aria-label="Daftar buku">
      <div class="alat">
        <div class="field cari-field">
          <label class="sr" for="cariKatalog">Cari di katalog</label>
          <svg class="ikon ikon-input" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>
          <input class="input dengan-ikon" id="cariKatalog" type="text" placeholder="Cari judul, pengarang, penerbit, atau kode" value="${s.q}" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label class="sr" for="filterKategori">Kategori</label>
          <select class="input" id="filterKategori"><option value="">Semua kategori</option></select>
        </div>
        <div class="field">
          <label class="sr" for="filterStatus">Status stok</label>
          <select class="input" id="filterStatus">
            <option value="">Semua status</option>
            <option value="menipis" ${s.status === "menipis" ? "selected" : ""}>Menipis di salah satu cabang</option>
            <option value="kosong" ${s.status === "kosong" ? "selected" : ""}>Kosong di salah satu cabang</option>
          </select>
        </div>
      </div>
      <p class="jumlah-hasil" id="jumlahHasil" aria-live="polite">&nbsp;</p>
      <div class="tabel-bungkus">
        <table class="tabel bisa-klik">
          <thead><tr><th>Kode</th><th>Judul</th><th class="sembunyi-hp">Penerbit</th><th class="sembunyi-hp">Kategori</th><th class="n">Harga</th><th class="n">Stok C1 / C2 / C3</th></tr></thead>
          <tbody id="isiTabel">${barisKerangka(6, 8)}</tbody>
        </table>
      </div>
      <div id="paginasi"></div>
    </section>`);

  const tbody = $("#isiTabel", ctx.root);
  const input = $("#cariKatalog", ctx.root);
  const selKat = $("#filterKategori", ctx.root);
  const selStatus = $("#filterStatus", ctx.root);
  let urutan = 0;

  // Opsi status di-render sebagai string polos: pasang ulang nilainya secara aman.
  selStatus.value = s.status;

  api.getKategori().then((ks) => {
    if (!ctx.aktif()) return;
    ks.forEach((k) => selKat.add(new Option(k, k, false, k === s.kategori)));
  }).catch(() => {});

  async function muat() {
    const nomor = ++urutan;
    ctx.gantiQuery({ q: s.q, kategori: s.kategori, status: s.status, hal: s.hal > 1 ? s.hal : "" });
    try {
      const r = await api.getBuku({ ...s, per: 10 });
      if (!ctx.aktif() || nomor !== urutan) return;
      s.hal = r.halaman;
      const adaSaring = s.q.trim() || s.kategori || s.status;
      pasang($("#jumlahHasil", ctx.root), adaSaring ? html`<b>${r.total}</b> dari ${r.semua} buku` : html`<b>${r.semua}</b> buku`);
      if (!r.items.length) {
        pasang(tbody, html`<tr class="baris-kosong"><td colspan="6">
          <p>Tidak ada buku yang cocok${s.q.trim() ? html` dengan “${s.q.trim()}”` : ""}${s.kategori ? html` di kategori ${s.kategori}` : ""}. Periksa ejaan atau cari dengan kode buku.</p>
          <button type="button" class="btn" id="hapusSaring">Hapus pencarian</button>
        </td></tr>`);
        pasang($("#paginasi", ctx.root), "");
        return;
      }
      pasang(tbody, html`${r.items.map((b) => html`<tr tabindex="0" data-href="#/stok/${encodeURIComponent(b.kode)}">
        <td class="kode">${sorot(b.kode, s.q)}</td>
        <td class="sel-judul"><div class="judul-sel"><b>${sorot(b.judul, s.q)}</b><span>${sorot(b.pengarang, s.q)}</span></div></td>
        <td class="sembunyi-hp">${sorot(b.penerbit, s.q)}</td>
        <td class="sembunyi-hp kecil-muted">${b.kategori}</td>
        <td class="n angka">${rupiah(b.harga)}</td>
        <td class="n">${rakMini(b, { sorotCabang: cabangKamu })}</td>
      </tr>`)}`);
      pasang($("#paginasi", ctx.root), paginasi(r));
    } catch (e) {
      if (e.kode === "SESI") return ctx.sesiHabis();
      if (!ctx.aktif() || nomor !== urutan) return;
      pasang(tbody, html`<tr class="baris-kosong"><td colspan="6">${panelGalat(e.message)}</td></tr>`);
      pasangCobaLagi(ctx.root, muat);
    }
  }

  const muatTunda = debounce(() => { s.hal = 1; muat(); }, 120);
  input.addEventListener("input", () => { s.q = input.value; muatTunda(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) { input.value = ""; s.q = ""; s.hal = 1; muat(); e.stopPropagation(); }
  });
  selKat.addEventListener("change", () => { s.kategori = selKat.value; s.hal = 1; muat(); });
  selStatus.addEventListener("change", () => { s.status = selStatus.value; s.hal = 1; muat(); });

  ctx.root.addEventListener("click", (e) => {
    if (e.target.id === "hapusSaring") {
      Object.assign(s, { q: "", kategori: "", status: "", hal: 1 });
      input.value = ""; selKat.value = ""; selStatus.value = "";
      input.focus();
      return muat();
    }
    const hal = e.target.closest("[data-hal]");
    if (hal && !hal.disabled) {
      s.hal = Number(hal.dataset.hal);
      muat().then(() => $(".daftar-panel", ctx.root)?.scrollIntoView({ block: "start" }));
      return;
    }
    const tr = e.target.closest("tr[data-href]");
    if (tr) location.hash = tr.dataset.href;
  });
  tbody.addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-href]");
    if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = tr.dataset.href; }
  });

  await muat();
}
