let el, teksEl, tombolEl, sisaEl, timer, aksiBatal, animSisa;

function siapkan() {
  if (el) return;
  el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = '<span class="toast-teks"></span><button type="button" class="toast-batal">Batalkan</button><span class="toast-sisa" aria-hidden="true"></span>';
  document.body.appendChild(el);
  teksEl = el.querySelector(".toast-teks");
  tombolEl = el.querySelector(".toast-batal");
  sisaEl = el.querySelector(".toast-sisa");
  tombolEl.addEventListener("click", async () => {
    const f = aksiBatal;
    aksiBatal = null;
    tutup();
    if (f) await f();
  });
}

export function toast(teks, { batal = null, lama = 6000 } = {}) {
  siapkan();
  teksEl.textContent = teks;
  aksiBatal = batal;
  tombolEl.hidden = !batal;
  // Garis yang menyusut menunjukkan sisa waktu untuk membatalkan.
  sisaEl.hidden = !batal;
  animSisa?.cancel();
  if (batal && sisaEl.animate) {
    animSisa = sisaEl.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: lama, easing: "linear", fill: "forwards" });
  }
  el.classList.add("buka");
  clearTimeout(timer);
  timer = setTimeout(tutup, lama);
}

export function tutup() {
  if (!el) return;
  el.classList.remove("buka");
  clearTimeout(timer);
}
