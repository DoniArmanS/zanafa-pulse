// Pencarian cepat: tekan "/" di mana saja.
import * as api from "../api.js";
import { html, pasang, sorot, debounce } from "../util.js";
import { rakMini } from "./rak.js";

let lapisan, input, daftarEl, hasil = [], terpilih = 0, kembaliFokus = null, bukaHalaman = null, urutan = 0, menunggu = false, enterTertunda = false;

function siapkan() {
  if (lapisan) return;
  lapisan = document.createElement("div");
  lapisan.className = "lapisan";
  lapisan.hidden = true;
  lapisan.innerHTML = `
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Cari buku">
      <div class="dialog-kepala">
        <svg class="ikon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>
        <label class="sr" for="cariCepat">Cari buku</label>
        <input id="cariCepat" type="text" placeholder="Judul, pengarang, penerbit, atau kode buku" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="cariHasil" aria-autocomplete="list">
        <kbd>Esc</kbd>
      </div>
      <ul class="hasil" id="cariHasil" role="listbox" aria-label="Hasil pencarian"></ul>
      <div class="dialog-kaki"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka stok tiga cabang</span><span><kbd>Esc</kbd> tutup</span></div>
    </div>`;
  document.body.appendChild(lapisan);
  input = lapisan.querySelector("input");
  daftarEl = lapisan.querySelector(".hasil");

  const cariTunda = debounce(async () => {
    const q = input.value;
    const nomor = ++urutan;
    try {
      const r = await api.getBuku({ q, per: 7 });
      if (nomor !== urutan) return;
      hasil = r.items;
      terpilih = 0;
      tampilkan(q);
      menunggu = false;
      if (enterTertunda) { enterTertunda = false; pilih(terpilih); }
    } catch (e) {
      menunggu = false;
      enterTertunda = false;
      if (nomor === urutan) pasang(daftarEl, html`<li class="kosong-teks">Pencarian gagal: ${e.message} Coba ketik lagi.</li>`);
    }
  }, 120);

  input.addEventListener("input", () => { menunggu = true; enterTertunda = false; cariTunda(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { terpilih = Math.min(terpilih + 1, hasil.length - 1); tampilkan(input.value); e.preventDefault(); }
    else if (e.key === "ArrowUp") { terpilih = Math.max(terpilih - 1, 0); tampilkan(input.value); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); if (!menunggu) pilih(terpilih); else enterTertunda = true; }
  });
  daftarEl.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) pilih(Number(li.dataset.i));
  });
  lapisan.addEventListener("click", (e) => { if (e.target === lapisan) tutup(); });
  lapisan.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { tutup(); e.stopPropagation(); }
    if (e.key === "Tab") { e.preventDefault(); input.focus(); }
  });
}

function tampilkan(q) {
  if (!hasil.length) {
    pasang(daftarEl, html`<li class="kosong-teks">Tidak ada buku yang cocok dengan “${q.trim()}”. Periksa ejaan atau cari dengan kode buku.</li>`);
    input.removeAttribute("aria-activedescendant");
    return;
  }
  pasang(daftarEl, html`${hasil.map((b, i) => html`<li role="option" id="hasil-${i}" data-i="${i}" aria-selected="${String(i === terpilih)}">
    <div class="judul-sel"><b>${sorot(b.judul, q)}</b><span>${sorot(b.pengarang, q)}, ${sorot(b.kode, q)}</span></div>
    ${rakMini(b)}
  </li>`)}`);
  input.setAttribute("aria-activedescendant", `hasil-${terpilih}`);
  daftarEl.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function pilih(i) {
  const b = hasil[i];
  if (!b) return;
  tutup(false);
  bukaHalaman?.(b.kode);
}

export async function buka() {
  siapkan();
  if (!lapisan.hidden) return;
  kembaliFokus = document.activeElement;
  lapisan.hidden = false;
  input.value = "";
  pasang(daftarEl, html`<li class="kosong-teks">Memuat…</li>`);
  requestAnimationFrame(() => {
    lapisan.classList.add("buka");
    input.focus();
  });
  document.documentElement.classList.add("terkunci");
  const nomor = ++urutan;
  try {
    const r = await api.getBuku({ per: 7 });
    if (nomor !== urutan || input.value) return;
    hasil = r.items;
    terpilih = 0;
    tampilkan("");
  } catch (e) {
    if (nomor === urutan && !input.value) pasang(daftarEl, html`<li class="kosong-teks">Daftar buku belum bisa dimuat. Ketik judul untuk mencoba lagi.</li>`);
  }
}

export function tutup(kembalikan = true) {
  if (!lapisan || lapisan.hidden) return;
  lapisan.classList.remove("buka");
  document.documentElement.classList.remove("terkunci");
  lapisan.hidden = true;
  if (kembalikan && kembaliFokus?.focus) kembaliFokus.focus();
}

export function pasangPintasan(onPilih) {
  bukaHalaman = onPilih;
  document.addEventListener("keydown", (e) => {
    const ketik = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === "/" && !ketik && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      buka();
    }
  });
}
