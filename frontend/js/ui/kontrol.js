import { html, raw } from "../util.js";

/* ---------- Kontrol bersegmen (radiogroup) ---------- */

export function segmen({ id, label, pilihan, nilai, kecil = false }) {
  return html`<div class="segmen${kecil ? " kecil" : ""}" role="radiogroup" aria-label="${label}" id="${id}" style="--kolom:${pilihan.length}">
    <span class="geser" aria-hidden="true"></span>
    ${pilihan.map((p) => html`<button type="button" role="radio" aria-checked="${String(p.nilai === nilai)}" tabindex="${p.nilai === nilai ? "0" : "-1"}" data-nilai="${p.nilai}">${p.label}</button>`)}
  </div>`;
}

export function aktifkanSegmen(el, onUbah) {
  if (!el) return;
  const geser = el.querySelector(".geser");
  const atur = () => {
    const a = el.querySelector('[aria-checked="true"]');
    if (!a || !a.offsetWidth) return;
    geser.style.width = a.offsetWidth + "px";
    geser.style.transform = `translateX(${a.offsetLeft - 4}px)`;
  };
  const pilih = (b, fokus) => {
    el.querySelectorAll("button").forEach((x) => {
      const on = x === b;
      x.setAttribute("aria-checked", String(on));
      x.tabIndex = on ? 0 : -1;
    });
    atur();
    if (fokus) b.focus();
    onUbah?.(b.dataset.nilai);
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b && b.getAttribute("aria-checked") !== "true") pilih(b);
  });
  el.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const bs = [...el.querySelectorAll("button")];
    const i = bs.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const maju = e.key === "ArrowRight" || e.key === "ArrowDown";
    pilih(bs[(i + (maju ? 1 : bs.length - 1)) % bs.length], true);
    e.preventDefault();
  });
  requestAnimationFrame(atur);
  document.fonts?.ready.then(atur);
  const ro = new ResizeObserver(atur);
  ro.observe(el);
}

/* ---------- Stepper jumlah ---------- */

export function stepper({ id, nilai = 0, min = 0, label }) {
  return html`<div class="stepper">
    <button type="button" data-langkah="-1" aria-label="Kurangi satu" tabindex="-1">−</button>
    <input id="${id}" name="${id}" type="number" inputmode="numeric" min="${min}" step="1" value="${nilai}" autocomplete="off" aria-label="${label || ""}">
    <button type="button" data-langkah="1" aria-label="Tambah satu" tabindex="-1">+</button>
  </div>`;
}

export function aktifkanStepper(root, onUbah) {
  root.querySelectorAll(".stepper").forEach((st) => {
    const input = st.querySelector("input");
    const min = Number(input.min || 0);
    let ulang = null;
    let tunda = null;
    const langkah = (d) => {
      const v = Math.max(min, (parseInt(input.value, 10) || 0) + d);
      input.value = v;
      onUbah?.(input);
    };
    st.querySelectorAll("[data-langkah]").forEach((b) => {
      const d = Number(b.dataset.langkah);
      const henti = () => {
        clearTimeout(tunda);
        clearInterval(ulang);
      };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        langkah(d);
        tunda = setTimeout(() => (ulang = setInterval(() => langkah(d), 70)), 380);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, henti));
    });
    input.addEventListener("input", () => onUbah?.(input));
  });
}

/* ---------- Paginasi ---------- */

export function paginasi({ halaman, totalHalaman }) {
  if (totalHalaman <= 1) return "";
  const nomor = [];
  for (let i = 1; i <= totalHalaman; i++) {
    if (i === 1 || i === totalHalaman || Math.abs(i - halaman) <= 1) nomor.push(i);
    else if (nomor.at(-1) !== "…") nomor.push("…");
  }
  return html`<nav class="paginasi" aria-label="Halaman">
    <button type="button" class="btn kecil" data-hal="${halaman - 1}" ${raw(halaman <= 1 ? "disabled" : "")} aria-label="Halaman sebelumnya">‹</button>
    ${nomor.map((n) => (n === "…" ? html`<span class="elipsis">…</span>` : html`<button type="button" class="btn kecil${n === halaman ? " aktif" : ""}" data-hal="${n}" ${raw(n === halaman ? 'aria-current="page"' : "")}>${n}</button>`))}
    <button type="button" class="btn kecil" data-hal="${halaman + 1}" ${raw(halaman >= totalHalaman ? "disabled" : "")} aria-label="Halaman berikutnya">›</button>
  </nav>`;
}

/* ---------- Keadaan memuat / kosong / error ---------- */

export function barisKerangka(kolom, baris = 6) {
  return html`${Array.from({ length: baris }, () => html`<tr class="kerangka-baris">${Array.from({ length: kolom }, (_, i) => html`<td><div class="kerangka" style="width:${[60, 85, 70, 50, 40][i % 5]}%"></div></td>`)}</tr>`)}`;
}

export function panelGalat(pesan, id = "cobaLagi") {
  return html`<div class="keadaan galat-panel" role="alert">
    <p><b>Data belum bisa dimuat.</b> ${pesan} Periksa koneksi, lalu coba lagi.</p>
    <button type="button" class="btn" id="${id}">Coba lagi</button>
  </div>`;
}

export function panelKosong(pesan, aksi = null) {
  return html`<div class="keadaan"><p>${pesan}</p>${aksi || ""}</div>`;
}
