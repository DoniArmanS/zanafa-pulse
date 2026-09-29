import * as api from "../api.js";
import { html, pasang, angka, waktuRelatif, tanggalJam, $ } from "../util.js";
import { setJudul, LABEL_JENIS, jumlahRiwayat, pasangCobaLagi } from "./bersama.js";
import { rakMini, statusStok } from "../ui/rak.js";
import { sampul } from "../ui/sampul.js";
import { panelGalat, panelKosong } from "../ui/kontrol.js";
import { grafikMini } from "../ui/grafik.js";
import { masuk, hitungNaik, gambarGaris } from "../ui/gerak.js";

export default async function dashboard(ctx) {
  return ctx.user.role === "manager" ? manager(ctx) : staff(ctx);
}

const fmtHari = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function salam() {
  const j = new Date().getHours();
  if (j < 11) return "Selamat pagi";
  if (j < 15) return "Selamat siang";
  if (j < 18) return "Selamat sore";
  return "Selamat malam";
}

// Pita sambutan: latar hijau di belakang kepala halaman, menyatu dengan navbar.
function sambutan({ judul, konteksId = "konteksDash", aksi, nama }) {
  return html`<header class="kepala sambutan">
    <div class="kepala-teks">
      <p class="sapa">${salam()}, ${nama}</p>
      <h1 tabindex="-1">${judul}</h1>
      <p class="konteks">${fmtHari.format(new Date())}. <span id="${konteksId}">Memuat ringkasan…</span></p>
    </div>
    <div class="kepala-aksi">${aksi}</div>
  </header>`;
}

function tampilkanLatar(ctx) {
  const latar = document.getElementById("latar");
  latar.hidden = false;
  const atur = () => {
    if (!ctx.aktif()) return window.removeEventListener("resize", atur);
    const r = ctx.root.querySelector(".ringkas");
    const nav = document.getElementById("navbar");
    if (!r) return;
    const atas = nav.getBoundingClientRect().bottom + window.scrollY;
    const bawah = r.getBoundingClientRect().top + window.scrollY + Math.min(r.offsetHeight * 0.42, 72);
    latar.style.top = `${atas}px`;
    latar.style.height = `${Math.max(120, bawah - atas)}px`;
  };
  atur();
  window.addEventListener("resize", atur);
  return atur;
}

function selKerangka(n) {
  return html`${Array.from({ length: n }, () => html`<div class="ringkas-sel"><div class="kerangka" style="width:40%"></div><div class="kerangka" style="width:30%;height:40px"></div><div class="kerangka" style="width:70%"></div></div>`)}`;
}

function animasiMasuk(ctx) {
  ctx.root.querySelectorAll("[data-nilai]").forEach((el, i) => hitungNaik(el, Number(el.dataset.nilai), { tunda: 0.05 * i }));
  ctx.root.querySelectorAll(".gm-garis").forEach((p, i) => gambarGaris(p, { tunda: 0.15 + 0.08 * i }));
  masuk(ctx.root.querySelectorAll(".dua-kolom > .panel"), { y: 14, jeda: 0.07, tunda: 0.12 });
}

/* ---------------- Staff ---------------- */

async function staff(ctx) {
  const c = ctx.user.idCabang;
  setJudul("Dashboard");
  pasang(ctx.root, html`
    ${sambutan({
      judul: `Ringkasan stok Cabang ${c}`,
      nama: ctx.user.nama.split(" ")[0],
      aksi: html`<a class="btn" href="#/cek-stok">Cek stok buku</a><a class="btn utama" href="#/kelola">Kelola stok</a>`,
    })}
    <section class="ringkas" id="ringkas" aria-label="Ringkasan">${selKerangka(3)}</section>
    <div class="dua-kolom" id="isiDash">
      <section class="panel"><div class="kerangka" style="width:50%"></div><div class="kerangka" style="height:180px"></div></section>
      <section class="panel"><div class="kerangka" style="width:50%"></div><div class="kerangka" style="height:180px"></div></section>
    </div>`);
  const aturLatar = tampilkanLatar(ctx);
  masuk(ctx.root.querySelectorAll(".sambutan .kepala-teks > *, .sambutan .kepala-aksi"), { y: 8, jeda: 0.05 });

  let d;
  try {
    d = await api.getDashboardStaff();
  } catch (e) {
    if (e.kode === "SESI") return ctx.sesiHabis();
    if (!ctx.aktif()) return;
    pasang(ctx.root.querySelector("#isiDash"), panelGalat(e.message));
    ctx.root.querySelector("#ringkas").remove();
    pasangCobaLagi(ctx.root, () => staff(ctx));
    return;
  }
  if (!ctx.aktif()) return;

  pasang(ctx.root.querySelector("#konteksDash"), html`${angka(d.eksemplar)} eksemplar tersimpan di cabang ini.`);
  pasang(ctx.root.querySelector("#ringkas"), html`
    <div class="ringkas-sel">
      <span class="ringkas-label">Judul tersedia</span>
      <span class="angka-besar" data-nilai="${d.judulTersedia}">${d.judulTersedia}</span>
      <span class="ringkas-sub">dari ${d.totalJudul} judul di katalog</span>
    </div>
    <a class="ringkas-sel tautan" href="#/kelola?status=menipis" data-sorot>
      <span class="ringkas-label">Judul menipis</span>
      <span class="angka-besar${d.menipis.length ? " merah" : ""}" data-nilai="${d.menipis.length}">${d.menipis.length}</span>
      <span class="ringkas-sub">${d.menipis.length ? "di bawah batas minimum, lihat di Kelola stok" : "semua di atas batas minimum"}</span>
    </a>
    <div class="ringkas-sel">
      <span class="ringkas-label">Terjual 30 hari</span>
      <span class="angka-grafik"><span class="angka-besar" data-nilai="${d.terjual30}">${angka(d.terjual30)}</span>${grafikMini(d.tren, { label: `Penjualan harian Cabang ${c}` })}</span>
      <span class="ringkas-sub">eksemplar, grafik 14 hari terakhir</span>
    </div>`);

  pasang(ctx.root.querySelector("#isiDash"), html`
    <section class="panel" aria-labelledby="hMenipis">
      <div class="panel-kepala">
        <h2 id="hMenipis">Peringatan stok menipis</h2>
        <p class="sub">Stok cabang lain terlihat di kanan, jadi kamu tahu ke mana pelanggan bisa diarahkan.</p>
      </div>
      ${d.menipis.length
        ? html`<ul class="daftar">${d.menipis.map((b) => html`<li class="baris-daftar">
            <a class="baris-utama" href="#/stok/${encodeURIComponent(b.kode)}">
              <span class="judul-sel"><b>${b.judul}</b><span>${b.kode}, minimum ${b.min}</span></span>
              <span class="stok-sini"><span class="angka merah">${b.stok[c - 1]}</span>${statusStok(b.stok[c - 1], b.min)}</span>
              ${rakMini(b, { sorotCabang: c })}
            </a>
            <a class="btn kecil" href="#/kelola/${encodeURIComponent(b.kode)}">Tambah stok</a>
          </li>`)}</ul>`
        : panelKosong(`Semua judul di Cabang ${c} di atas batas minimum.`)}
    </section>
    <section class="panel" aria-labelledby="hTerlaris">
      <div class="panel-kepala">
        <h2 id="hTerlaris">Buku terlaris 30 hari</h2>
        <p class="sub">Rekomendasi untuk pelanggan, dihitung dari penjualan di cabang ini.</p>
      </div>
      ${d.terlaris.length
        ? html`<ol class="peringkat">${d.terlaris.map((b, i) => html`<li>
            <a href="#/stok/${encodeURIComponent(b.kode)}">
              <span class="urutan">${i + 1}</span>
              ${sampul(b, "mini")}
              <span class="judul-sel"><b>${b.judul}</b><span>${b.pengarang}</span></span>
              <span class="terjual"><b>${b.terjual}</b> terjual</span>
            </a>
          </li>`)}</ol>`
        : panelKosong("Belum ada penjualan tercatat dalam 30 hari terakhir.")}
    </section>`);
  aturLatar();
  animasiMasuk(ctx);
}

/* ---------------- Manager ---------------- */

async function manager(ctx) {
  setJudul("Dashboard");
  pasang(ctx.root, html`
    ${sambutan({
      judul: "Ringkasan stok semua cabang",
      nama: ctx.user.nama.split(" ")[0],
      aksi: html`<a class="btn" href="#/kelola">Ubah stok</a><a class="btn utama" href="#/judul-baru">Tambah judul baru</a>`,
    })}
    <section class="ringkas" id="ringkas" aria-label="Ringkasan per cabang">${selKerangka(3)}</section>
    <div class="dua-kolom" id="isiDash">
      <section class="panel"><div class="kerangka" style="width:50%"></div><div class="kerangka" style="height:220px"></div></section>
      <section class="panel"><div class="kerangka" style="width:50%"></div><div class="kerangka" style="height:220px"></div></section>
    </div>`);
  const aturLatar = tampilkanLatar(ctx);
  masuk(ctx.root.querySelectorAll(".sambutan .kepala-teks > *, .sambutan .kepala-aksi"), { y: 8, jeda: 0.05 });

  let d;
  try {
    d = await api.getDashboardManager();
  } catch (e) {
    if (e.kode === "SESI") return ctx.sesiHabis();
    if (!ctx.aktif()) return;
    pasang(ctx.root.querySelector("#isiDash"), panelGalat(e.message));
    ctx.root.querySelector("#ringkas").remove();
    pasangCobaLagi(ctx.root, () => manager(ctx));
    return;
  }
  if (!ctx.aktif()) return;

  const totalMenipis = d.menipis.length;
  pasang(ctx.root.querySelector("#konteksDash"), html`${d.totalJudul} judul di katalog. ${totalMenipis ? `${totalMenipis} stok menipis perlu perhatian.` : "Tidak ada stok menipis."}`);

  pasang(ctx.root.querySelector("#ringkas"), html`${d.perCabang.map((p) => html`
    <a class="ringkas-sel tautan" href="#/kelola?cabang=${p.cabang}" data-sorot>
      <span class="ringkas-label">Cabang ${p.cabang}</span>
      <span class="angka-grafik">
        <span class="angka-baris"><span class="angka-besar" data-nilai="${p.judulTersedia}">${p.judulTersedia}</span><span class="satuan">judul</span></span>
        ${grafikMini(p.tren, { lebar: 104, label: `Penjualan harian Cabang ${p.cabang}` })}
      </span>
      <span class="ringkas-badge">${p.menipis ? html`<span class="badge menipis">${p.menipis} menipis</span>` : html`<span class="status-aman">Tidak ada yang menipis</span>`}${p.kosong ? html`<span class="badge kosong">${p.kosong} kosong</span>` : ""}</span>
      <span class="ringkas-sub">${angka(p.eksemplar)} eksemplar, ${angka(p.terjual30)} terjual 30 hari</span>
    </a>`)}`);

  const tampilMenipis = d.menipis.slice(0, 8);
  pasang(ctx.root.querySelector("#isiDash"), html`
    <section class="panel" aria-labelledby="hAktivitas">
      <div class="panel-kepala baris">
        <div><h2 id="hAktivitas">Aktivitas perubahan stok terbaru</h2><p class="sub">Siapa mengubah apa, di cabang mana.</p></div>
        <a class="btn teks kecil" href="#/riwayat">Lihat semua riwayat</a>
      </div>
      <ul class="aktivitas">${d.aktivitas.map((r) => html`<li>
        <span class="akt-waktu" title="${tanggalJam(r.tanggal)}">${waktuRelatif(r.tanggal)}</span>
        <span class="judul-sel"><b>${r.judul}</b><span>${r.staff}, Cabang ${r.cabang}</span></span>
        <span class="akt-jenis">${LABEL_JENIS[r.jenis]}</span>
        <span class="akt-jumlah angka">${jumlahRiwayat(r)}</span>
      </li>`)}</ul>
    </section>
    <section class="panel" aria-labelledby="hNotif">
      <div class="panel-kepala baris">
        <div><h2 id="hNotif">Stok menipis, semua cabang</h2><p class="sub">Email pemberitahuan dikirim otomatis ke Manager.</p></div>
        ${totalMenipis > tampilMenipis.length ? html`<a class="btn teks kecil" href="#/katalog?status=menipis">Lihat semua ${totalMenipis}</a>` : ""}
      </div>
      ${tampilMenipis.length
        ? html`<div class="gulir-x"><table class="tabel ringkas-tabel">
            <thead><tr><th>Judul</th><th>Cabang</th><th class="n">Stok</th><th>Email</th></tr></thead>
            <tbody>${tampilMenipis.map((m) => html`<tr>
              <td><a class="tautan-judul" href="#/stok/${encodeURIComponent(m.kode)}">${m.judul}</a></td>
              <td>C${m.cabang}</td>
              <td class="n"><span class="merah angka">${m.stok}</span><span class="per-min"> / ${m.min}</span></td>
              <td class="email">${m.notifikasi
                ? m.notifikasi.statusKirim
                  ? html`<span class="terkirim">Terkirim, ${waktuRelatif(m.notifikasi.tanggal)}</span>`
                  : html`<span class="gagal">Gagal, dicoba ulang</span>`
                : html`<span class="kecil-muted">Belum ada</span>`}</td>
            </tr>`)}</tbody>
          </table></div>`
        : panelKosong("Semua judul di tiga cabang di atas batas minimum.")}
    </section>`);
  aturLatar();
  animasiMasuk(ctx);
}
