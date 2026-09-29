import * as api from "../api.js";
import { html, pasang, $, hitungAngka, sorotSebentar, tanggal, jam } from "../util.js";
import { kepala, setJudul, LABEL_JENIS, jumlahRiwayat, pasangCobaLagi } from "./bersama.js";
import { rak, statusStok, rakKerangka } from "../ui/rak.js";
import { sampul } from "../ui/sampul.js";
import { segmen, aktifkanSegmen, stepper, aktifkanStepper, panelGalat } from "../ui/kontrol.js";
import { toast } from "../ui/toast.js";

const PILIHAN_JENIS = [
  { nilai: "tambah", label: "Tambah" },
  { nilai: "kurang", label: "Kurang" },
  { nilai: "koreksi", label: "Koreksi jumlah" },
];

export default async function ubah(ctx) {
  const manager = ctx.user.role === "manager";
  const kode = ctx.params.kode;
  const st = { cabang: manager ? Math.min(3, Math.max(1, Number(ctx.query.cabang) || 1)) : ctx.user.idCabang, jenis: "tambah", menyimpan: false };
  const hrefBalik = () => (manager ? `#/kelola?cabang=${st.cabang}` : "#/kelola");
  setJudul("Ubah jumlah stok");

  pasang(ctx.root, html`
    ${kepala({ judul: "Ubah jumlah stok", konteks: html`<span id="konteksUbah">Memuat buku…</span>`, balik: { href: hrefBalik(), label: "Kembali ke kelola stok" } })}
    <div class="ubah-grid" id="ubahGrid">
      <section class="panel angkat"><div class="kerangka" style="width:60%;height:24px"></div>${rakKerangka()}<div class="kerangka" style="height:160px"></div></section>
      <div class="kolom-samping"><section class="panel"><div class="kerangka" style="height:200px"></div></section></div>
    </div>`);

  let b;
  try {
    b = await api.getBukuDetail(kode);
  } catch (e) {
    if (!ctx.aktif()) return;
    if (e.kode === "TIDAK_ADA") {
      pasang($("#ubahGrid", ctx.root), html`<div class="keadaan besar"><p>${e.message}</p><a class="btn utama" href="${hrefBalik()}">Kembali ke kelola stok</a></div>`);
      return;
    }
    pasang($("#ubahGrid", ctx.root), panelGalat(e.message));
    pasangCobaLagi(ctx.root, () => ubah(ctx));
    return;
  }
  if (!ctx.aktif()) return;
  setJudul(`Ubah stok ${b.judul}`);

  pasang($("#ubahGrid", ctx.root), html`
    <section class="panel angkat ubah-form" aria-labelledby="judulUbah">
      <div class="buku-baris">
        ${sampul(b, "kecil")}
        <div class="judul-sel"><b id="judulUbah">${b.judul}</b><span>${b.kode}, ${b.pengarang}, ${b.penerbit}</span></div>
      </div>
      <div class="rak-satu" id="rakSatu"></div>
      <form id="formUbah" novalidate>
        <div class="field">
          <span class="label">Cabang</span>
          ${manager
            ? segmen({ id: "pilihCabang", label: "Cabang", nilai: String(st.cabang), pilihan: [1, 2, 3].map((c) => ({ nilai: String(c), label: `Cabang ${c}` })) })
            : html`<div class="tetap"><span class="titik-kuning" aria-hidden="true"></span><span>Cabang ${st.cabang} <span class="kecil-muted">(cabang kamu)</span></span></div>`}
        </div>
        <div class="field">
          <span class="label" id="labelJenis">Jenis perubahan</span>
          ${segmen({ id: "pilihJenis", label: "Jenis perubahan", nilai: st.jenis, pilihan: PILIHAN_JENIS })}
          <p class="bantuan" id="bantuanJenis"></p>
        </div>
        <div class="dua">
          <div class="field">
            <label for="jumlah" id="labelJumlah">Jumlah</label>
            ${stepper({ id: "jumlah", nilai: 1, min: 0 })}
          </div>
          <div class="field">
            <label for="keterangan">Keterangan <span class="opsional">(opsional)</span></label>
            <input class="input" id="keterangan" name="keterangan" type="text" maxlength="140" placeholder="Contoh: kiriman Gramedia" autocomplete="off">
          </div>
        </div>
        <div class="pratinjau" id="pratinjau" aria-live="polite"></div>
        <p class="galat-form" id="galatUbah" role="alert" hidden></p>
        <div class="aksi">
          <button class="btn utama" type="submit" id="simpan">Simpan perubahan</button>
          <a class="btn teks" href="${hrefBalik()}" id="batal">Batal</a>
        </div>
      </form>
    </section>
    <div class="kolom-samping">
      <section class="panel" aria-labelledby="hLain">
        <div class="panel-kepala"><h2 id="hLain">Stok di tiga cabang</h2><p class="sub">Batas minimum ${b.min} per cabang.</p></div>
        <div id="stokLain"></div>
      </section>
      <section class="panel" aria-labelledby="hRiwayat">
        <div class="panel-kepala"><h2 id="hRiwayat">Riwayat buku ini di <span id="riwayatCabang">Cabang ${st.cabang}</span></h2></div>
        <div id="riwayatBuku"><div class="kerangka" style="height:140px"></div></div>
      </section>
    </div>`);

  const jumlahEl = $("#jumlah", ctx.root);
  const simpanEl = $("#simpan", ctx.root);
  const galatEl = $("#galatUbah", ctx.root);
  const ci = () => st.cabang - 1;

  function renderRak(animasi, dari = null) {
    const n = b.stok[ci()];
    const h = hitung();
    pasang($("#rakSatu", ctx.root), html`
      <div class="cabang-kepala"><span>Stok Cabang ${st.cabang} saat ini</span>${!manager ? html`<span class="kamu">Cabang kamu</span>` : ""}</div>
      <div class="angka-baris"><span class="angka-besar" id="angkaSini">${dari ?? n}</span>${statusStok(n, b.min)}</div>
      ${rak({ kode: b.kode, n, min: b.min, cabang: st.cabang, animasi, pratinjau: h.ke !== undefined && !h.galat && h.ke !== n ? h.ke : null })}`);
    if (dari !== null) hitungAngka($("#angkaSini", ctx.root), dari, n);
  }

  function renderLain() {
    pasang($("#stokLain", ctx.root), html`<ul class="stok-cabang">${b.stok.map((n, i) => html`<li class="${i === ci() ? "aktif" : ""}">
      <span>Cabang ${i + 1}</span><b class="angka${n < b.min ? " merah" : ""}">${n}</b>${statusStok(n, b.min)}
    </li>`)}</ul>`);
  }

  async function muatRiwayat() {
    $("#riwayatCabang", ctx.root).textContent = `Cabang ${st.cabang}`;
    try {
      const rs = await api.getRiwayatBuku(b.kode, st.cabang, 6);
      if (!ctx.aktif()) return;
      pasang($("#riwayatBuku", ctx.root), rs.length
        ? html`<div class="gulir-x"><table class="tabel ringkas-tabel">
            <thead><tr><th>Waktu</th><th>Oleh</th><th>Jenis</th><th class="n">Jumlah</th><th class="n">Sesudah</th></tr></thead>
            <tbody>${rs.map((r) => html`<tr data-id="${r.id}"><td class="nowrap">${tanggal(r.tanggal)}<span class="kecil-muted">, ${jam(r.tanggal)}</span></td><td>${r.staff.split(" ")[0]}</td><td>${LABEL_JENIS[r.jenis]}</td><td class="n angka">${jumlahRiwayat(r)}</td><td class="n angka">${r.sesudah}</td></tr>`)}</tbody>
          </table></div>`
        : html`<p class="kecil-muted">Belum ada perubahan tercatat di cabang ini.</p>`);
    } catch (e) {
      if (ctx.aktif()) pasang($("#riwayatBuku", ctx.root), html`<p class="kecil-muted">Riwayat belum bisa dimuat.</p>`);
    }
  }

  function hitung() {
    const n = b.stok[ci()];
    const raw = jumlahEl.value.trim();
    const j = Number(raw);
    if (raw === "" || !Number.isInteger(j)) return { galat: "Isi jumlah dengan angka bulat." };
    if (st.jenis === "tambah") return j < 1 ? { galat: "Jumlah yang ditambah minimal 1." } : { ke: n + j };
    if (st.jenis === "kurang") {
      if (j < 1) return { galat: "Jumlah yang dikurangi minimal 1." };
      if (j > n) return { galat: `Stok Cabang ${st.cabang} tinggal ${n}. Jumlah yang dikurangi tidak boleh lebih dari ${n}.`, ke: n - j };
      return { ke: n - j };
    }
    if (j < 0) return { galat: "Jumlah hasil hitung tidak boleh negatif." };
    if (j === n) return { galat: "Jumlahnya sama dengan stok sekarang. Ubah angkanya jika hasil hitung berbeda.", ke: j, lunak: true };
    return { ke: j };
  }

  const BANTUAN = {
    tambah: "Barang masuk: kiriman penerbit, restok, atau retur dari cabang lain.",
    kurang: "Barang keluar: terjual, rusak, atau hilang.",
    koreksi: "Setel jumlah sesuai hasil hitung ulang di rak (stok opname).",
  };

  function perbarui(ubahRak = true) {
    const n = b.stok[ci()];
    const h = hitung();
    $("#labelJumlah", ctx.root).textContent = st.jenis === "koreksi" ? "Jumlah hasil hitung" : st.jenis === "tambah" ? "Jumlah masuk" : "Jumlah keluar";
    $("#bantuanJenis", ctx.root).textContent = BANTUAN[st.jenis];
    const p = $("#pratinjau", ctx.root);
    const bawahMin = h.ke !== undefined && !h.galat && h.ke < b.min;
    p.className = "pratinjau" + (h.galat && !h.lunak ? " salah" : "") + (bawahMin ? " peringatan" : "");
    pasang(p, html`<span class="dari angka">${n}</span><span class="panah" aria-hidden="true">→</span><span class="ke angka">${h.ke === undefined ? "?" : h.ke}</span>
      <span class="sr">stok Cabang ${st.cabang} setelah disimpan</span>
      <span class="ket">${h.galat ? "" : bawahMin ? `Di bawah minimum (${b.min}). Manager akan menerima email.` : "Di atas batas minimum"}</span>`);
    galatEl.hidden = !h.galat;
    galatEl.textContent = h.galat || "";
    galatEl.classList.toggle("lunak", !!h.lunak);
    jumlahEl.toggleAttribute("aria-invalid", !!h.galat && !h.lunak);
    simpanEl.disabled = !!h.galat || st.menyimpan;
    if (ubahRak) renderRak(false);
  }

  function aturAwalJumlah() {
    jumlahEl.value = st.jenis === "koreksi" ? b.stok[ci()] : 1;
  }

  aktifkanSegmen($("#pilihJenis", ctx.root), (v) => {
    st.jenis = v;
    aturAwalJumlah();
    perbarui();
  });
  if (manager) {
    aktifkanSegmen($("#pilihCabang", ctx.root), (v) => {
      st.cabang = Number(v);
      ctx.gantiQuery({ cabang: st.cabang });
      ctx.root.querySelectorAll('a[href^="#/kelola?"], a#batal').forEach((a) => a.setAttribute("href", hrefBalik()));
      if (st.jenis === "koreksi") aturAwalJumlah();
      pasang($("#konteksUbah", ctx.root), html`${b.judul}, Cabang ${st.cabang}`);
      renderRak(true);
      perbarui(false);
      renderLain();
      muatRiwayat();
    });
  }
  aktifkanStepper(ctx.root, () => perbarui());

  $("#formUbah", ctx.root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = hitung();
    if (h.galat) {
      jumlahEl.focus();
      return;
    }
    st.menyimpan = true;
    simpanEl.disabled = true;
    simpanEl.textContent = "Menyimpan…";
    const cabangSaatIni = st.cabang;
    const sebelum = b.stok[ci()];
    try {
      const r = await api.ubahStok({ kode: b.kode, cabang: cabangSaatIni, jenis: st.jenis, jumlah: Number(jumlahEl.value), keterangan: $("#keterangan", ctx.root).value });
      if (!ctx.aktif()) return;
      b = r.buku;
      $("#keterangan", ctx.root).value = "";
      aturAwalJumlah();
      renderRak(true, sebelum);
      sorotSebentar($("#rakSatu", ctx.root));
      renderLain();
      muatRiwayat();
      let teks = `Perubahan disimpan. Stok ${b.judul} di Cabang ${cabangSaatIni} jadi ${r.riwayat.sesudah}.`;
      if (r.notifikasi) teks += " Stok di bawah minimum, email dikirim ke Manager.";
      toast(teks, {
        batal: async () => {
          try {
            const kembali = await api.batalkanPerubahan(r.riwayat.id);
            if (!ctx.aktif()) return toast(`Perubahan dibatalkan. Stok kembali ${r.riwayat.sebelum}.`);
            const kini = b.stok[cabangSaatIni - 1];
            b = kembali;
            if (st.cabang === cabangSaatIni) {
              if (st.jenis === "koreksi") aturAwalJumlah();
              renderRak(true, kini);
              sorotSebentar($("#rakSatu", ctx.root));
              perbarui(false);
            }
            renderLain();
            muatRiwayat();
            toast(`Perubahan dibatalkan. Stok Cabang ${cabangSaatIni} kembali ${r.riwayat.sebelum}.`);
          } catch (err) {
            toast(`Tidak bisa dibatalkan: ${err.message}`);
          }
        },
      });
    } catch (err) {
      if (err.kode === "SESI") return ctx.sesiHabis();
      if (!ctx.aktif()) return;
      galatEl.hidden = false;
      galatEl.classList.remove("lunak");
      galatEl.textContent = err.kode === "VALIDASI" || err.kode === "AKSES" ? err.message : `Perubahan belum tersimpan: ${err.message} Coba simpan lagi.`;
    } finally {
      if (ctx.aktif()) {
        st.menyimpan = false;
        simpanEl.textContent = "Simpan perubahan";
        perbarui(false);
      }
    }
  });

  pasang($("#konteksUbah", ctx.root), html`${b.judul}, Cabang ${st.cabang}`);
  renderRak(true);
  perbarui(false);
  renderLain();
  muatRiwayat();
}
