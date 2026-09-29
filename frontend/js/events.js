
function attachEvents(){
  document.querySelectorAll("[data-set-role]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.loginRole = el.getAttribute("data-set-role");
      render();
    });
  });

  const loginBtn = document.querySelector('[data-action="login"]');
  if(loginBtn) loginBtn.addEventListener("click", doLogin);

  const pw = document.getElementById("loginPassword");
  if(pw) pw.addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });

  document.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const view = el.getAttribute("data-nav");
      if(view === "kelola"){ state.kelolaSelected = null; state.stockError=""; }
      goto(view);
    });
  });

  // Cek Stok tanpa login
  const enterPublicBtn = document.querySelector('[data-action="enter-public"]');
  if(enterPublicBtn) enterPublicBtn.addEventListener("click", ()=>{
    Object.assign(state, {publicMode:true, view:"cekstok", cekStokQuery:"", cekStokSelected:null});
    window.scrollTo(0,0);
    render();
  });
  const exitPublicBtn = document.querySelector('[data-action="exit-public"]');
  if(exitPublicBtn) exitPublicBtn.addEventListener("click", ()=>{
    Object.assign(state, {publicMode:false, view:"login", cekStokQuery:"", cekStokSelected:null});
    render();
  });

  const logoutBtn = document.querySelector('[data-action="logout"]');
  if(logoutBtn) logoutBtn.addEventListener("click", ()=>{
    Object.assign(state, {
      loggedIn:false, role:null, username:"", view:"login", loginError:"",
      cekStokQuery:"", cekStokSelected:null, kelolaQuery:"", kelolaCategory:"", kelolaSelected:null,
      katalogQuery:"", katalogCategory:"", katalogPage:1
    });
    render();
  });

  // Katalog
  const katalogSearchBtn = document.querySelector('[data-action="katalog-search"]');
  if(katalogSearchBtn) katalogSearchBtn.addEventListener("click", ()=>{
    state.katalogQuery = document.getElementById("katalogSearch").value;
    state.katalogPage = 1;
    render();
  });
  const katalogInput = document.getElementById("katalogSearch");
  if(katalogInput) katalogInput.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ state.katalogQuery = katalogInput.value; state.katalogPage=1; render(); }
  });
  const katalogCategorySelect = document.getElementById("katalogCategoryFilter");
  if(katalogCategorySelect) katalogCategorySelect.addEventListener("change", ()=>{
    state.katalogCategory = katalogCategorySelect.value;
    state.katalogQuery = document.getElementById("katalogSearch").value;
    state.katalogPage = 1;
    render();
  });
  document.querySelectorAll('[data-action="katalog-page"]').forEach(el=>{
    el.addEventListener("click", ()=>{ state.katalogPage = parseInt(el.getAttribute("data-page"),10); render(); });
  });

  // Cek Stok
  const cekStokBtn = document.querySelector('[data-action="cekstok-search"]');
  if(cekStokBtn) cekStokBtn.addEventListener("click", ()=>{
    state.cekStokQuery = document.getElementById("cekStokSearch").value;
    state.cekStokSelected = null;
    render();
  });
  const cekStokInput = document.getElementById("cekStokSearch");
  if(cekStokInput) cekStokInput.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ state.cekStokQuery = cekStokInput.value; state.cekStokSelected=null; render(); }
  });
  document.querySelectorAll('[data-action="cek-antar-cabang"]').forEach(el=>{
    el.addEventListener("click", ()=>{
      state.cekStokSelected = el.getAttribute("data-kode");
      goto("cekstok-detail");
    });
  });
  document.querySelectorAll('[data-action="cekstok-select"]').forEach(el=>{
    el.addEventListener("click", ()=>{
      state.cekStokSelected = el.getAttribute("data-kode");
      render();
    });
  });

  // Kelola
  const kelolaSearchBtn = document.querySelector('[data-action="kelola-search"]');
  if(kelolaSearchBtn) kelolaSearchBtn.addEventListener("click", ()=>{
    state.kelolaQuery = document.getElementById("kelolaSearch").value;
    render();
  });
  const kelolaInput = document.getElementById("kelolaSearch");
  if(kelolaInput) kelolaInput.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ state.kelolaQuery = kelolaInput.value; render(); }
  });
  const kelolaCategorySelect = document.getElementById("kelolaCategoryFilter");
  if(kelolaCategorySelect) kelolaCategorySelect.addEventListener("change", ()=>{
    state.kelolaCategory = kelolaCategorySelect.value;
    state.kelolaQuery = document.getElementById("kelolaSearch").value;
    render();
  });
  document.querySelectorAll('[data-action="kelola-edit"]').forEach(el=>{
    el.addEventListener("click", ()=>{
      state.kelolaSelected = el.getAttribute("data-kode");
      state.jenisPerubahan = "tambah";
      state.jumlahPerubahan = "";
      state.keteranganPerubahan = "";
      state.stockError = "";
      goto("kelola-edit");
    });
  });
  const kelolaSaveBtn = document.querySelector('[data-action="kelola-save"]');
  if(kelolaSaveBtn) kelolaSaveBtn.addEventListener("click", ()=>{
    saveStockChange(kelolaSaveBtn.getAttribute("data-kode"));
  });
  const jenisSelect = document.getElementById("jenisPerubahan");
  if(jenisSelect) jenisSelect.addEventListener("change", ()=>{
    state.jenisPerubahan = jenisSelect.value;
    state.jumlahPerubahan = document.getElementById("jumlahPerubahan").value;
    render();
  });
  const jumlahInput = document.getElementById("jumlahPerubahan");
  if(jumlahInput) jumlahInput.addEventListener("input", ()=>{
    state.jumlahPerubahan = jumlahInput.value;
    render();
    const el = document.getElementById("jumlahPerubahan");
    if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });

  // Tambah Judul Baru
  const saveNewBookBtn = document.querySelector('[data-action="save-new-book"]');
  if(saveNewBookBtn) saveNewBookBtn.addEventListener("click", saveNewBook);

  // Riwayat
  const riwayatFilterBtn = document.querySelector('[data-action="riwayat-filter"]');
  if(riwayatFilterBtn) riwayatFilterBtn.addEventListener("click", ()=>{
    state.riwayat.cabang = document.getElementById("filterCabang").value;
    state.riwayat.staff = document.getElementById("filterStaff").value;
    state.riwayat.jenis = document.getElementById("filterJenis").value;
    state.riwayat.from = document.getElementById("filterFrom").value;
    state.riwayat.to = document.getElementById("filterTo").value;
    render();
  });
  const riwayatResetBtn = document.querySelector('[data-action="riwayat-reset"]');
  if(riwayatResetBtn) riwayatResetBtn.addEventListener("click", ()=>{
    state.riwayat = {cabang:"", staff:"", jenis:"", from:"", to:""};
    render();
  });
  const riwayatExportBtn = document.querySelector('[data-action="riwayat-export"]');
  if(riwayatExportBtn) riwayatExportBtn.addEventListener("click", ()=>{
    showToast("Ekspor riwayat (contoh CSV) — fitur demo.");
  });

  const scrollBtn = document.querySelector('[data-action="scroll-to-list"]');
  if(scrollBtn) scrollBtn.addEventListener("click", ()=>{
    document.querySelector(".table-wrap")?.scrollIntoView({behavior:"smooth"});
  });
}

render();
