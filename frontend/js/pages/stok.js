import * as api from "../api.js";
import { html, pasang, rupiah, waktuRelatif, tanggalJam, $ } from "../util.js";
import { setJudul, pasangCobaLagi, LABEL_JENIS, jumlahRiwayat } from "./bersama.js";
import { rak, statusStok, rakKerangka } from "../ui/rak.js";
import { sampul } from "../ui/sampul.js";
import { panelGalat } from "../ui/kontrol.js";
import { hitungNaik } from "../ui/gerak.js";

export default async function stok(ctx) {
  const publik = ctx.mode === "publik";
  const kode = ctx.params.kode;
  const c = !publik && ctx.user?.role === "staff" ? ctx.user.idCabang : null;
  setJudul("Stok antar cabang");

  pasang(ctx.root, html`
    <a class="balik" href="${publik ? "#/publik" : "#/cek-stok"}">← Kembali ke cek stok</a>
    <div id="kepalaBuku" class="kepala-buku"><div class="kerangka sampul-kerangka"></div><div style="flex:1;display:grid;gap:10px"><div class="kerangka" style="width:40%;height:28px"></div><div class="kerangka" style="width:60%"></div></div></div>
    <section class="rak-panel" id="rakPanel" aria-label="Stok per cabang">${[1, 2, 3].map((i) => html`<div class="cabang"><div class="cabang-kepala"><span>Cabang ${i}</span></div>${rakKerangka()}</div>`)}</section>
    <div id="bawah"></div>`);

  let b;
  try {
    b = await api.getBukuDetail(kode);
  } catch (e) {
    if (!ctx.aktif()) return;
    if (e.kode === "TIDAK_ADA") {
      pasang(ctx.root, html`<a class="balik" href="${publik ? "#/publik" : "#/cek-stok"}">← Kembali ke cek stok</a>
        <div class="keadaan besar"><h1 tabindex="-1">Buku tidak ditemukan</h1><p>${e.message} Mungkin kodenya salah ketik atau bukunya sudah dihapus.</p><a class="btn utama" href="${publik ? "#/publik" : "#/katalog"}">${publik ? "Cari buku lain" : "Buka katalog"}</a></div>`);
      return;
    }
    pasang($("#rakPanel", ctx.root), html`<div class="cabang penuh">${panelGalat(e.message)}</div>`);
    pasangCobaLagi(ctx.root, () => stok(ctx));
    return;
  }
  if (!ctx.aktif()) return;
  setJudul(b.judul);

  const bisaUbah = !publik;
  const tujuanUbah = c ? `#/kelola/${encodeURIComponent(b.kode)}` : `#/kelola/${encodeURIComponent(b.kode)}?cabang=1`;
  pasang($("#kepalaBuku", ctx.root), html`
    ${sampul(b, "sedang")}
    <div class="kepala-teks">
      <h1 tabindex="-1">${b.judul}</h1>
      <p class="konteks"><b>${b.pengarang}</b>, ${b.penerbit}, ${b.tahun}.</p>
      <dl class="fakta">
        <div><dt>Harga</dt><dd class="angka">${rupiah(b.harga)}</dd></div>
        <div><dt>Kode</dt><dd>${b.kode}</dd></div>
        <div><dt>Kategori</dt><dd>${b.kategori}</dd></div>
        <div><dt>Batas minimum</dt><dd class="angka">${b.min} per cabang</dd></div>
      </dl>
    </div>
    ${bisaUbah ? html`<div class="kepala-aksi"><a class="btn utama" href="${tujuanUbah}">${c ? `Ubah stok Cabang ${c}` : "Ubah stok"}</a></div>` : ""}`);

  const total = b.stok.reduce((a, n) => a + n, 0);
  pasang($("#rakPanel", ctx.root), html`${b.stok.map((n, i) => html`<div class="cabang${c === i + 1 ? " milik" : ""}">
    <div class="cabang-kepala"><span>Cabang ${i + 1}</span>${c === i + 1 ? html`<span class="kamu">Cabang kamu</span>` : ""}</div>
    <div class="angka-baris"><span class="angka-besar" data-nilai="${n}">${n}</span>${statusStok(n, b.min)}</div>
    ${rak({ kode: b.kode, n, min: b.min, cabang: i + 1 })}
  </div>`)}`);

  ctx.root.querySelectorAll("#rakPanel [data-nilai]").forEach((el) => hitungNaik(el, Number(el.dataset.nilai), { durasi: 0.5 }));

  const bawah = $("#bawah", ctx.root);
  if (total === 0) {
    pasang(bawah, html`<div class="pemberitahuan merah-lembut" role="status"><b>Stok kosong di semua cabang.</b> ${publik ? "Tanyakan ke kasir untuk memesan buku ini." : "Catat permintaan pelanggan dan beri tahu Manager untuk pemesanan ulang."}</div>`);
  } else if (c && b.stok[c - 1] === 0) {
    const lain = b.stok.map((n, i) => ({ n, i })).filter((x) => x.n > 0 && x.i !== c - 1).sort((a, z) => z.n - a.n);
    pasang(bawah, html`<div class="pemberitahuan" role="status">Stok di cabang ini habis. Arahkan pelanggan ke <b>Cabang ${lain[0].i + 1}</b> (${lain[0].n} eksemplar).</div>`);
  }

  if (publik) return;
  const el = document.createElement("section");
  el.className = "panel";
  el.setAttribute("aria-labelledby", "hRiwayatBuku");
  bawah.appendChild(el);
  pasang(el, html`<div class="panel-kepala"><h2 id="hRiwayatBuku">Perubahan terakhir</h2><p class="sub">Lima perubahan stok terbaru buku ini di semua cabang.</p></div><div id="riwayatBuku"><div class="kerangka" style="height:120px"></div></div>`);
  try {
    const rs = await api.getRiwayatBuku(b.kode, null, 5);
    if (!ctx.aktif()) return;
    pasang($("#riwayatBuku", ctx.root), rs.length
      ? html`<ul class="aktivitas">${rs.map((r) => html`<li>
          <span class="akt-waktu" title="${tanggalJam(r.tanggal)}">${waktuRelatif(r.tanggal)}</span>
          <span class="judul-sel"><b>Cabang ${r.cabang}</b><span>${r.staff}${r.keterangan ? `, ${r.keterangan}` : ""}</span></span>
          <span class="akt-jenis">${LABEL_JENIS[r.jenis]}</span>
          <span class="akt-jumlah angka">${jumlahRiwayat(r)}</span>
        </li>`)}</ul>`
      : html`<p class="kecil-muted">Belum ada perubahan tercatat untuk buku ini.</p>`);
  } catch (e) {
    if (ctx.aktif()) pasang($("#riwayatBuku", ctx.root), html`<p class="kecil-muted">Riwayat belum bisa dimuat.</p>`);
  }
}
