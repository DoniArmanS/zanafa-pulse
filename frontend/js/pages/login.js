import * as api from "../api.js";
import { html, pasang, $, labelPengguna } from "../util.js";
import { setJudul } from "./bersama.js";
import { toast } from "../ui/toast.js";
import { gsap, kurangiGerak, punyaMouse, masuk, getar, gambarGaris } from "../ui/gerak.js";
import { grafikMini } from "../ui/grafik.js";

// Adegan demo di panel kiri: memerankan alur aplikasi (rak -> ubah stok -> toast -> peringatan).
const DEMO = [
  { judul: "Laut Bercerita", pengarang: "Leila S. Chudori", cabang: 1, dari: 7, ke: 10, min: 5 },
  { judul: "Filosofi Teras", pengarang: "Henry Manampiring", cabang: 2, dari: 7, ke: 3, min: 5 },
  { judul: "Laskar Pelangi", pengarang: "Andrea Hirata", cabang: 3, dari: 9, ke: 14, min: 5 },
];
const KATA = ["terpantau.", "tercatat.", "terjawab."];
const PUNGGUNG = 16;
const TINGGI = [34, 40, 30, 44, 36, 42, 32, 38, 45, 33, 41, 35, 43, 31, 39, 37];
const WARNA = ["var(--kuning-500)", "rgba(255,255,255,.88)", "#3E8A5A", "rgba(255,255,255,.5)", "#2C7A4B", "var(--kuning-500)", "rgba(255,255,255,.7)"];

export default async function login(ctx) {
  setJudul("Masuk");
  const akun = api.akunContoh();
  pasang(ctx.root, html`<section class="login">
    <div class="login-panel">
      <div class="aurora" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div>
      <div class="butir" aria-hidden="true"></div>

      <div class="login-merek">
        <span class="logo besar" aria-hidden="true"></span>
        <div><b>Zanafa Bookstore</b><span>Sistem inventaris buku</span></div>
      </div>

      <div class="panggung" aria-hidden="true">
        <div class="kartu-demo demo-utama">
          <div class="demo-kepala">
            <span class="demo-sampul"></span>
            <div class="demo-nama"><b class="demo-judul"></b><span class="demo-pengarang"></span></div>
            <span class="demo-cabang"></span>
          </div>
          <div class="demo-angka-baris"><span class="demo-angka">0</span><span class="demo-status"></span></div>
          <div class="demo-rak">${TINGGI.map((h, i) => html`<i style="height:${h}px;--w:${WARNA[i % WARNA.length]}"></i>`)}<span class="demo-batas"><span>min 5</span></span></div>
        </div>
        <div class="kartu-demo demo-toast">
          <svg viewBox="0 0 20 20" class="demo-centang"><path d="M5 10.5l3.2 3.2L15 7"/></svg>
          <div><b>Perubahan disimpan</b><span class="demo-toast-teks"></span></div>
        </div>
        <div class="kartu-demo demo-grafik">
          <span class="demo-label">Terjual 14 hari</span>
          <b class="demo-total">1.284</b>
          ${grafikMini([62, 70, 58, 81, 77, 90, 84, 96, 88, 104, 99, 112, 108, 125], { lebar: 150, tinggi: 42, label: "Contoh grafik penjualan" })}
        </div>
        <div class="kartu-demo demo-notif">
          <span class="denyut"></span>
          <div><b>Stok menipis</b><span>Email terkirim ke Manager</span></div>
        </div>
      </div>

      <div class="login-judul">
        <p class="kinetik">Stok buku selalu <span class="kata-bingkai"><span class="kata">${KATA[0]}</span></span></p>
        <p class="login-sub">Toko Buku Zanafa, Pekanbaru</p>
      </div>
    </div>

    <div class="login-isi">
      <form id="formMasuk" class="login-form" novalidate>
        <h1 tabindex="-1">Masuk</h1>
        <p class="konteks">Gunakan akun yang diberikan Manager toko.</p>
        <div class="field">
          <label for="username">Username</label>
          <input class="input" id="username" name="username" type="text" autocomplete="username" spellcheck="false" autocapitalize="none" placeholder="Contoh: sari" required>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-dengan-tombol">
            <input class="input" id="password" name="password" type="password" autocomplete="current-password" required>
            <button type="button" class="intip" aria-pressed="false" aria-controls="password">Lihat</button>
          </div>
        </div>
        <p class="galat-form" id="galatMasuk" role="alert" hidden></p>
        <button class="btn utama lebar" type="submit" id="tombolMasuk">Masuk</button>
      </form>

      <div class="pemisah"><span>atau</span></div>
      <a class="btn lebar" href="#/publik">Cek stok tanpa login</a>
      <p class="kecil-muted">Untuk melihat ketersediaan buku tanpa akun.</p>

      <details class="akun-contoh">
        <summary>Akun contoh untuk mencoba prototipe</summary>
        <p>Semua akun memakai password <code>zanafa123</code>. Data tersimpan di browser ini saja.</p>
        <ul>
          ${akun.map((a) => html`<li><button type="button" class="btn teks kecil" data-akun="${a.username}"><b>${a.username}</b></button><span>${a.nama}, ${labelPengguna(a)}</span></li>`)}
        </ul>
        <button type="button" class="btn teks kecil" id="pulihkan">Pulihkan data contoh</button>
      </details>
    </div>
  </section>`);

  const form = $("#formMasuk", ctx.root);
  const galat = $("#galatMasuk", ctx.root);
  const tombol = $("#tombolMasuk", ctx.root);
  const intip = $(".intip", ctx.root);

  intip.addEventListener("click", () => {
    const pw = $("#password", ctx.root);
    const lihat = pw.type === "password";
    pw.type = lihat ? "text" : "password";
    intip.textContent = lihat ? "Sembunyikan" : "Lihat";
    intip.setAttribute("aria-pressed", String(lihat));
  });

  ctx.root.querySelectorAll("[data-akun]").forEach((b) =>
    b.addEventListener("click", () => {
      $("#username", ctx.root).value = b.dataset.akun;
      $("#password", ctx.root).value = "zanafa123";
      tombol.focus();
    })
  );

  $("#pulihkan", ctx.root).addEventListener("click", async (e) => {
    e.target.disabled = true;
    await api.pulihkanDataContoh();
    e.target.disabled = false;
    toast("Data contoh dipulihkan ke kondisi awal.");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = $("#username", ctx.root);
    const p = $("#password", ctx.root);
    galat.hidden = true;
    u.removeAttribute("aria-invalid");
    p.removeAttribute("aria-invalid");
    if (!u.value.trim() || !p.value) {
      galat.textContent = !u.value.trim() ? "Isi username dulu." : "Isi password dulu.";
      galat.hidden = false;
      (!u.value.trim() ? u : p).setAttribute("aria-invalid", "true");
      (!u.value.trim() ? u : p).focus();
      getar(form);
      return;
    }
    tombol.disabled = true;
    tombol.textContent = "Memeriksa…";
    try {
      await api.login(u.value, p.value);
      const ke = ctx.query.ke && ctx.query.ke.startsWith("/") && !ctx.query.ke.startsWith("/login") ? ctx.query.ke : "/dashboard";
      location.hash = "#" + ke;
    } catch (err) {
      if (!ctx.aktif()) return;
      galat.textContent = err.kode === "KREDENSIAL" ? err.message : `Tidak bisa masuk: ${err.message} Coba lagi sebentar.`;
      galat.hidden = false;
      p.value = "";
      p.setAttribute("aria-invalid", "true");
      p.focus();
      getar(form);
      tombol.disabled = false;
      tombol.textContent = "Masuk";
    }
  });

  masuk([...form.children, ...ctx.root.querySelectorAll(".login-isi > :not(form)")], { y: 8, jeda: 0.035, durasi: 0.4 });
  mulaiAdegan(ctx);
  requestAnimationFrame(() => $("#username", ctx.root)?.focus());
}

/* ---------------- Adegan demo ---------------- */

function mulaiAdegan(ctx) {
  const gs = gsap();
  const panel = $(".login-panel", ctx.root);
  const q = (s) => panel.querySelector(s);
  const el = {
    utama: q(".demo-utama"), toast: q(".demo-toast"), notif: q(".demo-notif"),
    judul: q(".demo-judul"), pengarang: q(".demo-pengarang"), cabang: q(".demo-cabang"), sampul: q(".demo-sampul"),
    angka: q(".demo-angka"), status: q(".demo-status"), toastTeks: q(".demo-toast-teks"),
    kata: q(".kata"), punggung: [...panel.querySelectorAll(".demo-rak i")], batas: q(".demo-batas"),
  };

  const isi = (d) => {
    el.judul.textContent = d.judul;
    el.pengarang.textContent = d.pengarang;
    el.cabang.textContent = `Cabang ${d.cabang}`;
    el.sampul.style.setProperty("--bg", ["var(--hijau-700)", "var(--tinta)", "#2C7A4B"][d.cabang - 1]);
    el.batas.style.left = `${d.min * 13 - 2}px`;
    el.toastTeks.textContent = `${d.judul}: stok jadi ${d.ke}`;
  };
  const status = (n, d) => {
    const tipis = n < d.min;
    el.status.textContent = tipis ? "Menipis" : "Aman";
    el.status.classList.toggle("tipis", tipis);
    el.punggung.forEach((p) => p.classList.toggle("tipis", tipis));
  };

  // Tanpa GSAP atau mode kurangi-gerak: tampilkan keadaan akhir adegan pertama, tanpa loop.
  if (!gs || kurangiGerak()) {
    const d = DEMO[0];
    isi(d);
    el.angka.textContent = d.ke;
    status(d.ke, d);
    el.punggung.forEach((p, i) => (p.style.transform = i < d.ke ? "scaleY(1)" : "scaleY(0)"));
    el.toast.style.opacity = "1";
    return;
  }

  gs.set(el.punggung, { scaleY: 0, transformOrigin: "50% 100%" });
  gs.set([el.toast, el.notif], { autoAlpha: 0 });
  gs.from(el.utama, { autoAlpha: 0, y: 24, duration: 0.8, ease: "expo.out", delay: 0.15 });
  gs.from(q(".demo-grafik"), { autoAlpha: 0, y: 20, duration: 0.8, ease: "expo.out", delay: 0.45 });
  gambarGaris(q(".demo-grafik .gm-garis"), { tunda: 0.6 });

  let tl = null;
  const ganti = (i) => {
    if (!ctx.aktif()) return;
    const d = DEMO[i % DEMO.length];
    const angka = { v: d.dari };
    tl = gs.timeline({ onComplete: () => ganti(i + 1) });

    // 1. Buku baru masuk rak
    tl.call(() => { isi(d); status(d.dari, d); el.angka.textContent = d.dari; })
      .fromTo([el.judul, el.pengarang, el.cabang, el.sampul], { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "expo.out", stagger: 0.05 })
      .to(el.punggung.slice(0, d.dari), { scaleY: 1, duration: 0.5, ease: "expo.out", stagger: 0.035 }, "<");
    if (i > 0) tl.add(gantiKata(gs, el.kata, KATA[i % KATA.length]), "<");

    // 2. Stok berubah
    tl.addLabel("ubah", "+=0.9");
    if (d.ke > d.dari) {
      tl.to(el.punggung.slice(d.dari, d.ke), { scaleY: 1, duration: 0.45, ease: "back.out(1.6)", stagger: 0.07 }, "ubah");
    } else {
      tl.to(el.punggung.slice(d.ke, d.dari).reverse(), { scaleY: 0, duration: 0.35, ease: "power2.inOut", stagger: 0.06 }, "ubah");
    }
    tl.to(angka, { v: d.ke, duration: 0.6, ease: "power2.out", onUpdate: () => (el.angka.textContent = Math.round(angka.v)) }, "ubah")
      .call(() => status(d.ke, d), null, "ubah+=0.45")
      // 3. Toast, lalu peringatan bila menipis
      .fromTo(el.toast, { autoAlpha: 0, x: 28 }, { autoAlpha: 1, x: 0, duration: 0.55, ease: "expo.out" }, "ubah+=0.35");
    if (d.ke < d.min) {
      tl.fromTo(el.notif, { autoAlpha: 0, y: 14, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, "ubah+=0.75");
    }

    // 4. Tahan, lalu bersihkan untuk buku berikutnya
    tl.addLabel("keluar", "+=2.2")
      .to([el.toast, el.notif], { autoAlpha: 0, x: 18, duration: 0.3, ease: "power2.out" }, "keluar")
      .to(el.punggung, { scaleY: 0, duration: 0.3, ease: "power2.inOut", stagger: { each: 0.015, from: "end" } }, "keluar+=0.1")
      .to([el.judul, el.pengarang, el.cabang, el.sampul], { autoAlpha: 0, y: -6, duration: 0.25, ease: "power2.out" }, "keluar+=0.1")
      .set(el.notif, { x: 0 });
  };
  ganti(0);

  // Jeda saat tab tidak terlihat atau halaman ditinggalkan.
  const cekTerlihat = () => {
    if (!ctx.aktif()) { tl?.kill(); document.removeEventListener("visibilitychange", cekTerlihat); return; }
    document.hidden ? tl?.pause() : tl?.resume();
  };
  document.addEventListener("visibilitychange", cekTerlihat);
  window.addEventListener("hashchange", function lepas() {
    if (ctx.aktif()) return;
    tl?.kill();
    gs.killTweensOf(el.punggung);
    window.removeEventListener("hashchange", lepas);
  });

  // Kedalaman yang mengikuti mouse (hanya perangkat dengan mouse).
  if (!punyaMouse()) return;
  const panggung = q(".panggung");
  gs.set(panggung, { transformPerspective: 900 });
  const rx = gs.quickTo(panggung, "rotationX", { duration: 0.6, ease: "power3" });
  const ry = gs.quickTo(panggung, "rotationY", { duration: 0.6, ease: "power3" });
  const tx = gs.quickTo([el.toast, el.notif], "xPercent", { duration: 0.8, ease: "power3" });
  panel.addEventListener("pointermove", (e) => {
    const r = panel.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    ry(nx * 8);
    rx(-ny * 6);
    tx(nx * 6);
  });
  panel.addEventListener("pointerleave", () => { rx(0); ry(0); tx(0); });
}

function gantiKata(gs, el, kata) {
  return gs.timeline()
    .to(el, { yPercent: -110, autoAlpha: 0, duration: 0.3, ease: "power3.out" })
    .call(() => (el.textContent = kata))
    .fromTo(el, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "expo.out" });
}
