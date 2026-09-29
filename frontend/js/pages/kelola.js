import * as api from "../api.js";
import { html, pasang, sorot, debounce, $ } from "../util.js";
import { kepala, setJudul, pasangCobaLagi } from "./bersama.js";
import { statusStok } from "../ui/rak.js";
import { segmen, aktifkanSegmen, paginasi, barisKerangka, panelGalat } from "../ui/kontrol.js";

export default async function kelola(ctx) {
  const manager = ctx.user.role === "manager";
  const s = {
    cabang: manager ? Math.min(3, Math.max(1, Number(ctx.query.cabang) || 1)) : ctx.user.idCabang,
    q: ctx.query.q || "", kategori: ctx.query.kategori || "", status: ctx.query.status || "", hal: Number(ctx.query.hal) || 1,
  };
  setJudul("Kelola stok");

  pasang(ctx.root, html`
    ${kepala({
      judul: html`Kelola stok <span id="judulCabang">Cabang ${s.cabang}</span>`,
      konteks: manager ? "Pilih cabang, lalu pilih buku yang stoknya berubah." : "Stok yang kamu ubah di sini tercatat atas namamu di riwayat.",
      aksi: manager ? segmen({ id: "pilihCabang", label: "Cabang", nilai: String(s.cabang), pilihan: [1, 2, 3].map((c) => ({ nilai: String(c), label: `Cabang ${c}` })) }) : "",
    })}
    <div class="dua-kolom seimbang">
      <section class="panel aksi-panel">
        <h2>Buku belum ada di sistem</h2>
        <p class="sub">Untuk judul yang baru datang dari penerbit. Sistem membuat data bukunya sekaligus mencatat stok awal.</p>
        <a class="btn utama" href="#/judul-baru">Tambah judul baru</a>
      </section>
      <section class="panel aksi-panel">
        <h2>Buku sudah ada, stoknya berubah</h2>
        <p class="sub">Untuk barang masuk, terjual, rusak, atau hasil hitung ulang. Cari bukunya di daftar, lalu pilih Ubah stok.</p>
        <button type="button" class="btn" id="keDaftar">Cari buku di daftar</button>
      </section>
    </div>
    <section class="panel daftar-panel" aria-labelledby="hDaftar">
      <div class="panel-kepala"><h2 id="hDaftar">Daftar buku di <span id="subCabang">Cabang ${s.cabang}</span></h2></div>
      <div class="alat">
        <div class="field cari-field">
          <label class="sr" for="cariKelola">Cari buku</label>
          <svg class="ikon ikon-input" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>
          <input class="input dengan-ikon" id="cariKelola" type="text" placeholder="Cari judul, pengarang, penerbit, atau kode" value="${s.q}" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label class="sr" for="kelolaKategori">Kategori</label>
          <select class="input" id="kelolaKategori"><option value="">Semua kategori</option></select>
        </div>
        <div class="field">
          <label class="sr" for="kelolaStatus">Status</label>
          <select class="input" id="kelolaStatus">
            <option value="">Semua status</option>
            <option value="menipis">Menipis</option>
            <option value="kosong">Kosong</option>
          </select>
        </div>
      </div>
      <p class="jumlah-hasil" id="jumlahHasil" aria-live="polite">&nbsp;</p>
      <div class="tabel-bungkus">
        <table class="tabel bisa-klik">
          <thead><tr><th>Kode</th><th>Judul</th><th class="n">Stok</th><th class="n sembunyi-hp">Minimum</th><th>Status</th><th class="aksi-kol"><span class="sr">Aksi</span></th></tr></thead>
          <tbody id="isiTabel">${barisKerangka(6, 8)}</tbody>
        </table>
      </div>
      <div id="paginasi"></div>
    </section>`);

  const input = $("#cariKelola", ctx.root);
  const selKat = $("#kelolaKategori", ctx.root);
  const selStatus = $("#kelolaStatus", ctx.root);
  const tbody = $("#isiTabel", ctx.root);
  selStatus.value = s.status;
  let urutan = 0;

  api.getKategori().then((ks) => {
    if (ctx.aktif()) ks.forEach((k) => selKat.add(new Option(k, k, false, k === s.kategori)));
  }).catch(() => {});

  if (manager) {
    aktifkanSegmen($("#pilihCabang", ctx.root), (v) => {
      s.cabang = Number(v);
      s.hal = 1;
      $("#judulCabang", ctx.root).textContent = `Cabang ${v}`;
      $("#subCabang", ctx.root).textContent = `Cabang ${v}`;
      muat();
    });
  }

  async function muat() {
    const nomor = ++urutan;
    ctx.gantiQuery({ cabang: manager ? s.cabang : "", q: s.q, kategori: s.kategori, status: s.status, hal: s.hal > 1 ? s.hal : "" });
    const ci = s.cabang - 1;
    try {
      const r = await api.getBuku({ q: s.q, kategori: s.kategori, status: s.status, cabang: s.cabang, hal: s.hal, per: 10, urut: "kode" });
      if (!ctx.aktif() || nomor !== urutan) return;
      s.hal = r.halaman;
      const adaSaring = s.q.trim() || s.kategori || s.status;
      pasang($("#jumlahHasil", ctx.root), adaSaring ? html`<b>${r.total}</b> dari ${r.semua} buku` : html`<b>${r.semua}</b> buku`);
      if (!r.items.length) {
        pasang(tbody, html`<tr class="baris-kosong"><td colspan="6">
          <p>${s.status && !s.q.trim() && !s.kategori ? `Tidak ada buku berstatus ${s.status} di Cabang ${s.cabang}.` : html`Tidak ada buku yang cocok${s.q.trim() ? html` dengan “${s.q.trim()}”` : ""}. Periksa ejaan atau cari dengan kode buku.`}</p>
          <button type="button" class="btn" id="hapusSaring">Hapus pencarian</button>
        </td></tr>`);
        pasang($("#paginasi", ctx.root), "");
        return;
      }
      const tujuan = (b) => `#/kelola/${encodeURIComponent(b.kode)}${manager ? `?cabang=${s.cabang}` : ""}`;
      pasang(tbody, html`${r.items.map((b) => {
        const n = b.stok[ci];
        return html`<tr tabindex="0" data-href="${tujuan(b)}">
          <td class="kode">${sorot(b.kode, s.q)}</td>
          <td class="sel-judul"><div class="judul-sel"><b>${sorot(b.judul, s.q)}</b><span>${sorot(b.pengarang, s.q)}</span></div></td>
          <td class="n" data-label="Stok"><b class="angka${n < b.min ? " merah" : ""}">${n}</b></td>
          <td class="n angka sembunyi-hp kecil-muted">${b.min}</td>
          <td>${statusStok(n, b.min)}</td>
          <td class="aksi-kol"><a class="btn kecil" href="${tujuan(b)}">Ubah stok</a></td>
        </tr>`;
      })}`);
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
  $("#keDaftar", ctx.root).addEventListener("click", () => {
    $(".daftar-panel", ctx.root).scrollIntoView({ behavior: "smooth", block: "start" });
    input.focus({ preventScroll: true });
  });

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
    if (e.target.closest("a")) return;
    const tr = e.target.closest("tr[data-href]");
    if (tr) location.hash = tr.dataset.href;
  });
  tbody.addEventListener("keydown", (e) => {
    const tr = e.target.closest("tr[data-href]");
    if (tr && e.target === tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = tr.dataset.href; }
  });

  await muat();
}
