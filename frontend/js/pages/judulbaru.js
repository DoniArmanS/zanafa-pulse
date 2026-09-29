import * as api from "../api.js";
import { html, pasang, $, debounce, rupiah } from "../util.js";
import { kepala, setJudul } from "./bersama.js";
import { sampul } from "../ui/sampul.js";
import { segmen, aktifkanSegmen, stepper, aktifkanStepper } from "../ui/kontrol.js";
import { toast } from "../ui/toast.js";

const FIELD = ["kode", "kategori", "judul", "pengarang", "penerbit", "harga", "tahun", "stokAwal", "min"];

export default async function judulbaru(ctx) {
  const manager = ctx.user.role === "manager";
  const st = { cabang: manager ? 1 : ctx.user.idCabang, sampul: null, menyimpan: false };
  setJudul("Tambah judul baru");
  const tahunIni = new Date().getFullYear();

  const field = (id, label, input, lebar = false) => html`<div class="field${lebar ? " penuh" : ""}" data-field="${id}">
    <label for="${id}">${label}</label>${input}<p class="galat-field" id="galat-${id}" hidden></p></div>`;

  pasang(ctx.root, html`
    ${kepala({
      judul: "Tambah judul baru",
      konteks: "Untuk buku yang belum terdaftar. Setelah disimpan, buku muncul di katalog dan stok awalnya tercatat di riwayat sebagai Judul baru.",
      balik: { href: "#/kelola", label: "Kembali ke kelola stok" },
    })}
    <form class="judul-grid" id="formJudul" novalidate>
      <section class="panel" aria-labelledby="hData">
        <h2 id="hData">Data buku</h2>
        <div class="form-grid">
          ${field("kode", "Kode buku atau ISBN", html`<input class="input" id="kode" name="kode" type="text" placeholder="Contoh: BK-026 atau 9786020000000" autocomplete="off" spellcheck="false" autocapitalize="characters">`)}
          ${field("kategori", "Kategori", html`<input class="input" id="kategori" name="kategori" type="text" list="daftarKategori" placeholder="Pilih atau ketik kategori baru" autocomplete="off"><datalist id="daftarKategori"></datalist>`)}
          ${field("judul", "Judul buku", html`<input class="input" id="judul" name="judul" type="text" placeholder="Contoh: Laut Bercerita" autocomplete="off">`, true)}
          ${field("pengarang", "Pengarang", html`<input class="input" id="pengarang" name="pengarang" type="text" placeholder="Contoh: Leila S. Chudori" autocomplete="off">`)}
          ${field("penerbit", "Penerbit", html`<input class="input" id="penerbit" name="penerbit" type="text" placeholder="Contoh: KPG" autocomplete="off">`)}
          ${field("harga", "Harga jual (Rp)", html`<input class="input" id="harga" name="harga" type="number" inputmode="numeric" min="0" step="500" placeholder="Contoh: 95000" autocomplete="off"><p class="bantuan" id="hargaTeks"></p>`)}
          ${field("tahun", "Tahun terbit", html`<input class="input" id="tahun" name="tahun" type="number" inputmode="numeric" min="1900" max="${tahunIni + 1}" value="${tahunIni}" autocomplete="off">`)}
        </div>

        <h2 class="subjudul">Stok awal yang masuk</h2>
        <div class="form-grid">
          <div class="field penuh">
            <span class="label">Cabang tujuan</span>
            ${manager
              ? segmen({ id: "cabangTujuan", label: "Cabang tujuan", nilai: "1", pilihan: [1, 2, 3].map((c) => ({ nilai: String(c), label: `Cabang ${c}` })) })
              : html`<div class="tetap"><span class="titik-kuning" aria-hidden="true"></span><span>Cabang ${st.cabang} <span class="kecil-muted">(cabang kamu)</span></span></div>`}
          </div>
          ${field("stokAwal", "Jumlah stok awal", stepper({ id: "stokAwal", nilai: 0, min: 0 }))}
          <div class="field" data-field="min">
            <label for="min">Batas minimum stok</label>
            ${stepper({ id: "min", nilai: 5, min: 0 })}
            <p class="bantuan">Jika stok di satu cabang turun di bawah angka ini, buku ditandai menipis dan Manager menerima email.</p>
            <p class="galat-field" id="galat-min" hidden></p>
          </div>
        </div>
        <p class="galat-form" id="galatJudul" role="alert" hidden></p>
        <div class="aksi">
          <button class="btn utama" type="submit" id="simpanJudul">Simpan judul baru</button>
          <a class="btn teks" href="#/kelola">Batal</a>
        </div>
      </section>

      <aside class="panel sampul-panel" aria-labelledby="hSampul">
        <h2 id="hSampul">Sampul <span class="opsional">(opsional)</span></h2>
        <div class="sampul-pratinjau" id="pratinjauSampul"></div>
        <input type="file" id="fileSampul" accept="image/png,image/jpeg,image/webp" class="sr">
        <div class="aksi">
          <label class="btn" for="fileSampul" id="labelUnggah">Unggah gambar</label>
          <button type="button" class="btn teks" id="hapusSampul" hidden>Hapus gambar</button>
        </div>
        <p class="bantuan">JPG, PNG, atau WebP, maksimal 5 MB. Tanpa gambar, sampul dibuat otomatis dari judul.</p>
        <p class="galat-field" id="galat-sampul" hidden></p>
        <div class="pratinjau-katalog">
          <span class="label">Tampilan di katalog</span>
          <div id="pratinjauBaris"></div>
        </div>
      </aside>
    </form>`);

  const form = $("#formJudul", ctx.root);
  const nilai = (id) => $("#" + id, ctx.root)?.value ?? "";

  api.getKategori().then((ks) => {
    if (!ctx.aktif()) return;
    const dl = $("#daftarKategori", ctx.root);
    ks.forEach((k) => dl.appendChild(new Option(k, k)));
  }).catch(() => {});

  function data() {
    return {
      kode: nilai("kode"), kategori: nilai("kategori"), judul: nilai("judul"), pengarang: nilai("pengarang"),
      penerbit: nilai("penerbit"), harga: nilai("harga"), tahun: nilai("tahun"), stokAwal: nilai("stokAwal"),
      min: nilai("min"), cabang: st.cabang, sampul: st.sampul,
    };
  }

  function pratinjau() {
    const d = data();
    const b = { kode: d.kode || "BARU", judul: d.judul || "Judul buku", pengarang: d.pengarang || "Pengarang", sampul: st.sampul };
    pasang($("#pratinjauSampul", ctx.root), sampul(b, "besar"));
    const stokAwal = Math.max(0, parseInt(d.stokAwal, 10) || 0);
    const min = Math.max(0, parseInt(d.min, 10) || 0);
    const stok = [1, 2, 3].map((c) => (c === st.cabang ? stokAwal : 0));
    pasang($("#pratinjauBaris", ctx.root), html`<div class="baris-contoh">
      <span class="judul-sel"><b>${d.judul || "Judul buku"}</b><span>${d.pengarang || "Pengarang"}</span></span>
      <span class="mini-contoh">${stok.map((n, i) => html`<span class="c">C${i + 1}</span><b class="angka${n < min ? " merah" : ""}">${n}</b>`)}</span>
    </div>`);
    const h = Number(d.harga);
    $("#hargaTeks", ctx.root).textContent = d.harga && h > 0 ? `Tampil sebagai ${rupiah(h)}` : "";
  }

  function tandai(fieldId, pesan) {
    const g = $("#galat-" + fieldId, ctx.root);
    const inp = $("#" + fieldId, ctx.root);
    if (g) {
      g.textContent = pesan || "";
      g.hidden = !pesan;
    }
    if (inp) {
      inp.toggleAttribute("aria-invalid", !!pesan);
      if (pesan && g) inp.setAttribute("aria-describedby", g.id);
      else inp.removeAttribute("aria-describedby");
    }
  }

  const cekKode = debounce(async () => {
    const k = nilai("kode").trim();
    if (!k) return tandai("kode", "");
    const g = api.validasiJudul({ ...data(), kategori: "x", judul: "x", pengarang: "x", penerbit: "x", harga: 1, tahun: tahunIni, stokAwal: 0, min: 0 });
    tandai("kode", g?.field === "kode" ? g.pesan : "");
  }, 250);

  form.addEventListener("input", (e) => {
    const id = e.target.id;
    if (FIELD.includes(id) && id !== "kode") tandai(id, "");
    if (id === "kode") cekKode();
    pratinjau();
  });
  aktifkanStepper(ctx.root, (inp) => {
    tandai(inp.id, "");
    pratinjau();
  });
  if (manager) aktifkanSegmen($("#cabangTujuan", ctx.root), (v) => { st.cabang = Number(v); pratinjau(); });

  $("#fileSampul", ctx.root).addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    tandai("sampul", "");
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return tandai("sampul", "Pilih gambar JPG, PNG, atau WebP.");
    if (f.size > 5 * 1024 * 1024) return tandai("sampul", "Gambar lebih dari 5 MB. Pilih gambar yang lebih kecil.");
    try {
      st.sampul = await perkecil(f, 320);
      $("#hapusSampul", ctx.root).hidden = false;
      $("#labelUnggah", ctx.root).textContent = "Ganti gambar";
      pratinjau();
    } catch (_) {
      tandai("sampul", "Gambar tidak bisa dibaca. Coba file lain.");
    }
  });
  $("#hapusSampul", ctx.root).addEventListener("click", () => {
    st.sampul = null;
    $("#hapusSampul", ctx.root).hidden = true;
    $("#labelUnggah", ctx.root).textContent = "Unggah gambar";
    pratinjau();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (st.menyimpan) return;
    FIELD.forEach((f) => tandai(f, ""));
    $("#galatJudul", ctx.root).hidden = true;
    const d = data();
    const g = api.validasiJudul(d);
    if (g) {
      tandai(g.field, g.pesan);
      $("#" + g.field, ctx.root)?.focus();
      return;
    }
    const tombol = $("#simpanJudul", ctx.root);
    st.menyimpan = true;
    tombol.disabled = true;
    tombol.textContent = "Menyimpan…";
    try {
      const r = await api.tambahJudul(d);
      if (!ctx.aktif()) return;
      toast(`Judul baru ditambahkan. ${r.buku.judul} tersimpan dengan stok awal ${d.stokAwal} di Cabang ${st.cabang}.`, {
        batal: async () => {
          try {
            await api.batalkanPerubahan(r.riwayat.id);
            toast(`Penambahan ${r.buku.judul} dibatalkan.`);
            if (location.hash.includes(encodeURIComponent(r.buku.kode))) location.hash = "#/kelola";
          } catch (err) {
            toast(`Tidak bisa dibatalkan: ${err.message}`);
          }
        },
      });
      location.hash = `#/stok/${encodeURIComponent(r.buku.kode)}`;
    } catch (err) {
      if (err.kode === "SESI") return ctx.sesiHabis();
      if (!ctx.aktif()) return;
      if (err.field) {
        tandai(err.field, err.message);
        $("#" + err.field, ctx.root)?.focus();
      } else {
        const ge = $("#galatJudul", ctx.root);
        ge.textContent = `Judul belum tersimpan: ${err.message} Coba simpan lagi.`;
        ge.hidden = false;
      }
      st.menyimpan = false;
      tombol.disabled = false;
      tombol.textContent = "Simpan judul baru";
    }
  });

  pratinjau();
  requestAnimationFrame(() => $("#kode", ctx.root)?.focus());
}

function perkecil(file, lebar) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, lebar / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("gambar"));
    };
    img.src = url;
  });
}
