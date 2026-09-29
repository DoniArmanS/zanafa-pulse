import * as api from "../api.js";
import { html, pasang, sorot, debounce, $, tanggal, jam } from "../util.js";
import { kepala, setJudul, LABEL_JENIS, jumlahRiwayat, pasangCobaLagi } from "./bersama.js";
import { paginasi, barisKerangka, panelGalat } from "../ui/kontrol.js";
import { toast } from "../ui/toast.js";

// Tanggal lokal (WIB), bukan UTC.
function hariIni() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function riwayat(ctx) {
  setJudul("Riwayat stok");
  const q = ctx.query;
  const s = { q: q.q || "", cabang: q.cabang || "", dari: q.dari || "", sampai: q.sampai || "", staff: q.staff || "", jenis: q.jenis || "", hal: Number(q.hal) || 1 };

  pasang(ctx.root, html`
    ${kepala({
      judul: "Riwayat perubahan stok",
      konteks: "Semua perubahan stok di tiga cabang, terbaru di atas. Dipakai untuk memantau aktivitas dan menyusun laporan.",
      aksi: html`<button type="button" class="btn utama" id="ekspor">Ekspor CSV</button>`,
    })}
    <section class="panel daftar-panel" aria-label="Riwayat">
      <div class="alat alat-riwayat">
        <div class="field cari-field">
          <label for="cariRiwayat">Cari</label>
          <input class="input" id="cariRiwayat" type="text" placeholder="Judul, kode, atau keterangan" value="${s.q}" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label for="fCabang">Cabang</label>
          <select class="input" id="fCabang"><option value="">Semua cabang</option>${[1, 2, 3].map((c) => html`<option value="${c}">Cabang ${c}</option>`)}</select>
        </div>
        <div class="field">
          <label for="fDari">Dari tanggal</label>
          <input class="input" id="fDari" type="date" value="${s.dari}">
        </div>
        <div class="field">
          <label for="fSampai">Sampai tanggal</label>
          <input class="input" id="fSampai" type="date" value="${s.sampai}">
        </div>
        <div class="field">
          <label for="fStaff">Nama staff</label>
          <select class="input" id="fStaff"><option value="">Semua staff</option></select>
        </div>
        <div class="field">
          <label for="fJenis">Jenis</label>
          <select class="input" id="fJenis">
            <option value="">Semua jenis</option>
            ${Object.entries(LABEL_JENIS).map(([k, v]) => html`<option value="${k}">${v}</option>`)}
          </select>
        </div>
      </div>
      <p class="galat-form" id="galatTanggal" role="alert" hidden></p>
      <div class="ringkas-riwayat" id="ringkasRiwayat" aria-live="polite">&nbsp;</div>
      <div class="tabel-bungkus">
        <table class="tabel riwayat-tabel">
          <thead><tr><th>Waktu</th><th>Staff</th><th>Cabang</th><th>Buku</th><th>Jenis</th><th class="n">Jumlah</th><th class="n">Sebelum</th><th class="n">Sesudah</th></tr></thead>
          <tbody id="isiTabel">${barisKerangka(8, 10)}</tbody>
        </table>
      </div>
      <div id="paginasi"></div>
    </section>`);

  const el = (id) => $("#" + id, ctx.root);
  el("fCabang").value = s.cabang;
  el("fJenis").value = s.jenis;
  const tbody = el("isiTabel");
  let urutan = 0;

  api.getStaff().then((us) => {
    if (!ctx.aktif()) return;
    us.forEach((u) => el("fStaff").add(new Option(`${u.nama} (${u.role === "manager" ? "Manager" : `Cabang ${u.idCabang}`})`, String(u.id), false, String(u.id) === s.staff)));
  }).catch(() => {});

  const saring = () => ({ q: s.q, cabang: s.cabang, dari: s.dari, sampai: s.sampai, staff: s.staff, jenis: s.jenis });
  const adaSaring = () => Object.values(saring()).some((v) => String(v).trim());

  function tanggalSalah() {
    const salah = s.dari && s.sampai && s.dari > s.sampai;
    el("galatTanggal").hidden = !salah;
    el("galatTanggal").textContent = salah ? "Tanggal “dari” tidak boleh setelah tanggal “sampai”. Ubah salah satunya." : "";
    el("fDari").toggleAttribute("aria-invalid", !!salah);
    el("fSampai").toggleAttribute("aria-invalid", !!salah);
    return salah;
  }

  async function muat() {
    if (tanggalSalah()) return;
    const nomor = ++urutan;
    ctx.gantiQuery({ ...saring(), hal: s.hal > 1 ? s.hal : "" });
    try {
      const r = await api.getRiwayat({ ...saring(), hal: s.hal, per: 15 });
      if (!ctx.aktif() || nomor !== urutan) return;
      s.hal = r.halaman;
      const k = r.ringkas;
      pasang(el("ringkasRiwayat"), html`<span><b>${r.total}</b> perubahan</span>
        ${k.tambah ? html`<span class="chip">${k.tambah} tambah</span>` : ""}
        ${k.kurang ? html`<span class="chip">${k.kurang} kurang</span>` : ""}
        ${k.koreksi ? html`<span class="chip">${k.koreksi} koreksi</span>` : ""}
        ${k.judul_baru ? html`<span class="chip">${k.judul_baru} judul baru</span>` : ""}
        ${adaSaring() ? html`<button type="button" class="btn teks kecil" id="hapusSaring">Hapus semua filter</button>` : ""}`);
      el("ekspor").textContent = r.total ? `Ekspor CSV (${r.total})` : "Ekspor CSV";
      el("ekspor").disabled = !r.total;
      if (!r.items.length) {
        pasang(tbody, html`<tr class="baris-kosong"><td colspan="8"><p>Tidak ada perubahan stok yang cocok dengan filter ini. Coba perlebar rentang tanggal atau pilih semua cabang.</p><button type="button" class="btn" id="hapusSaring2">Hapus semua filter</button></td></tr>`);
        pasang(el("paginasi"), "");
        return;
      }
      pasang(tbody, html`${r.items.map((x) => html`<tr>
        <td class="nowrap"><b class="tgl">${tanggal(x.tanggal)}</b><span class="kecil-muted">${jam(x.tanggal)}</span></td>
        <td>${x.staff}</td>
        <td class="nowrap">Cabang ${x.cabang}</td>
        <td class="sel-judul"><div class="judul-sel"><b>${sorot(x.judul, s.q)}</b><span>${sorot(x.kode, s.q)}${x.keterangan ? html`, ${sorot(x.keterangan, s.q)}` : ""}</span></div></td>
        <td class="nowrap">${LABEL_JENIS[x.jenis]}</td>
        <td class="n angka nowrap">${jumlahRiwayat(x)}</td>
        <td class="n angka" data-label="Sebelum">${x.jenis === "judul_baru" ? "—" : x.sebelum}</td>
        <td class="n angka" data-label="Sesudah"><b>${x.sesudah}</b></td>
      </tr>`)}`);
      pasang(el("paginasi"), paginasi(r));
    } catch (e) {
      if (e.kode === "SESI") return ctx.sesiHabis();
      if (!ctx.aktif() || nomor !== urutan) return;
      pasang(tbody, html`<tr class="baris-kosong"><td colspan="8">${panelGalat(e.message)}</td></tr>`);
      pasangCobaLagi(ctx.root, muat);
    }
  }

  const ulang = () => { s.hal = 1; muat(); };
  const cariTunda = debounce(ulang, 120);
  el("cariRiwayat").addEventListener("input", (e) => { s.q = e.target.value; cariTunda(); });
  el("cariRiwayat").addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target.value) { e.target.value = ""; s.q = ""; ulang(); e.stopPropagation(); }
  });
  [["fCabang", "cabang"], ["fDari", "dari"], ["fSampai", "sampai"], ["fStaff", "staff"], ["fJenis", "jenis"]].forEach(([id, k]) =>
    el(id).addEventListener("change", (e) => { s[k] = e.target.value; ulang(); })
  );

  ctx.root.addEventListener("click", async (e) => {
    if (e.target.id === "hapusSaring" || e.target.id === "hapusSaring2") {
      Object.assign(s, { q: "", cabang: "", dari: "", sampai: "", staff: "", jenis: "", hal: 1 });
      ["cariRiwayat", "fCabang", "fDari", "fSampai", "fStaff", "fJenis"].forEach((id) => (el(id).value = ""));
      el("cariRiwayat").focus();
      return muat();
    }
    const hal = e.target.closest("[data-hal]");
    if (hal && !hal.disabled) {
      s.hal = Number(hal.dataset.hal);
      muat().then(() => $(".daftar-panel", ctx.root)?.scrollIntoView({ block: "start" }));
    }
  });

  el("ekspor").addEventListener("click", async () => {
    if (tanggalSalah()) return;
    const tombol = el("ekspor");
    const teksAwal = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = "Menyiapkan…";
    try {
      const { csv, jumlah } = await api.eksporRiwayat(saring());
      const nama = `riwayat-stok_${s.cabang ? `cabang-${s.cabang}` : "semua-cabang"}_${s.dari || "awal"}_${s.sampai || hariIni()}.csv`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: nama });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Laporan diekspor: ${jumlah} baris, file ${nama}.`);
    } catch (err) {
      toast(`Ekspor gagal: ${err.message} Coba lagi.`);
    } finally {
      tombol.disabled = false;
      tombol.textContent = teksAwal;
    }
  });

  await muat();
}
