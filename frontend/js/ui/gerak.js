// Satu-satunya tempat animasi berbasis JS. Aturan: .claude/skills/zanafa-frontend/SKILL.md bagian "Gerak".
// GSAP dimuat sebagai <script> biasa (vendor/gsap-*.min.js) sehingga tersedia di window.gsap.
// Semua fungsi aman dipanggil walau GSAP gagal dimuat: animasi dilewati, isi tetap tampil.

const g = () => window.gsap || null;
export const kurangiGerak = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const punyaMouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const EASE_KELUAR = "expo.out";

// Isi yang baru dimuat muncul berurutan (mengganti kerangka, bukan dekorasi).
export function masuk(target, { y = 10, jeda = 0.05, tunda = 0, durasi = 0.34 } = {}) {
  const gs = g();
  const els = typeof target === "string" ? document.querySelectorAll(target) : target;
  if (!gs || !els || (els.length === 0) ) return null;
  if (kurangiGerak()) return gs.from(els, { autoAlpha: 0, duration: 0.2, stagger: 0.02, clearProps: "opacity,visibility" });
  return gs.from(els, {
    autoAlpha: 0, y, duration: durasi, ease: EASE_KELUAR, stagger: jeda, delay: tunda,
    clearProps: "transform,opacity,visibility",
  });
}

// Angka berhitung dari 0 (atau `dari`) ke nilai akhir, dengan pemisah ribuan Indonesia.
const fmt = new Intl.NumberFormat("id-ID");
export function hitungNaik(el, ke, { dari = 0, durasi = 0.7, tunda = 0 } = {}) {
  const gs = g();
  if (!el) return;
  if (!gs || kurangiGerak() || dari === ke) {
    el.textContent = fmt.format(ke);
    return;
  }
  const o = { v: dari };
  el.textContent = fmt.format(dari);
  gs.to(o, { v: ke, duration: durasi, delay: tunda, ease: "power2.out", onUpdate: () => (el.textContent = fmt.format(Math.round(o.v))) });
}

// Garis grafik tergambar dari kiri ke kanan.
export function gambarGaris(path, { tunda = 0 } = {}) {
  const gs = g();
  if (!path || !gs || kurangiGerak()) return;
  const p = path.getTotalLength();
  gs.fromTo(path, { strokeDasharray: p, strokeDashoffset: p }, { strokeDashoffset: 0, duration: 0.9, delay: tunda, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" });
}

// Sorotan cahaya yang mengikuti kursor di kartu yang bisa diklik (hanya perangkat dengan mouse).
let sorotTerpasang = false;
export function pasangSorotKursor() {
  if (sorotTerpasang) return;
  sorotTerpasang = true;
  let bingkai = 0;
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !punyaMouse()) return;
    const el = e.target.closest?.("[data-sorot]");
    if (!el) return;
    cancelAnimationFrame(bingkai);
    bingkai = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }, { passive: true });
}

// Getar singkat untuk umpan balik salah (mis. password salah). Dilewati di mode kurangi-gerak.
export function getar(el) {
  if (!el || kurangiGerak() || !el.animate) return;
  el.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
    { duration: 280, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
  );
}

export const gsapAda = () => !!g();
export const gsap = g;
