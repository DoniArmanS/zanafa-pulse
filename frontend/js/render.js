
function navLinksFor(){
  const links = [
    {key:"dashboard", label:"Dashboard"},
    {key:"katalog", label:"Katalog Buku"},
    {key:"cekstok", label:"Cek Stok"},
    {key:"kelola", label:"Kelola Stok"},
  ];
  
  if(state.role === "manager"){
    links.push({key:"riwayat", label:"Riwayat Stok"});
  }
  return links;
}

// Navbar sederhana untuk mode Cek Stok tanpa login
function renderPublicNavbar(){
  return `
  <div class="navbar">
    <div class="brand"><span class="logo-badge"><img src="${LOGO_SRC}" alt="Logo"></span> ZANAFA BOOKSTORE</div>
    <div class="nav-right">
      <span class="small muted">Mode cek stok (tanpa login)</span>
      <div class="divider-v"></div>
      <button class="btn btn-primary" data-action="exit-public">Masuk</button>
    </div>
  </div>`;
}

function renderAccessDenied(){
  return `
  <div class="page">
    <div class="h-page">Akses Ditolak</div>
    <div class="panel notice-panel">
      <p>Halaman ini hanya dapat diakses oleh <strong>Manager/Owner</strong>.</p>
      <button class="btn btn-primary" data-nav="dashboard">Kembali ke Dashboard</button>
    </div>
  </div>`;
}

function renderNavbar(activeKey){
  const links = navLinksFor();
  return `
  <div class="navbar">
    <div class="brand"><span class="logo-badge"><img src="${LOGO_SRC}" alt="Logo"></span> ZANAFA BOOKSTORE</div>
    <div class="nav-links">
      ${links.map(l=>`<a data-nav="${l.key}" class="${activeKey===l.key?'active':''}">${l.label}</a>`).join("")}
    </div>
    <div class="nav-right">
      <div class="user-chip ${activeKey==='profil'?'active':''}" data-nav="profil" title="Lihat profil">
        <img class="avatar" src="${PROFILE.photo}" alt="Foto profil">
        <div class="role-label">${currentStaffLabel()}<small>${BRANCH_LABEL[state.cabang]}</small></div>
      </div>
      <div class="divider-v"></div>
      <button class="btn" data-action="logout">Logout</button>
    </div>
  </div>`;
}

//Login view

function renderLogin(){
  return `
  <div class="center-screen">
    <div class="login-box">
      <div class="logo-row"><span class="logo-circle"><img src="${LOGO_SRC}" alt="Logo Zanafa Bookstore"></span></div>
      <h1>Selamat Datang</h1>
      <div class="login-sub">Masuk untuk mengelola inventaris Zanafa Bookstore</div>

      <div class="field">
        <label>Login sebagai</label>
        <div class="role-toggle">
          <label class="opt ${state.loginRole==='staff'?'selected':''}" data-set-role="staff">
            <input type="radio" name="loginRole" ${state.loginRole==='staff'?'checked':''}>
            <span>Staff</span>
          </label>
          <label class="opt ${state.loginRole==='manager'?'selected':''}" data-set-role="manager">
            <input type="radio" name="loginRole" ${state.loginRole==='manager'?'checked':''}>
            <span>Manager</span>
          </label>
        </div>
      </div>

      <div class="field">
        <label>Username</label>
        <input type="text" id="loginUsername" placeholder="username" value="${state.username}">
      </div>
      <div class="field">
        <label>Password</label>
        <input type="password" id="loginPassword" placeholder="••••••••">
      </div>

      <button class="btn btn-primary btn-block" data-action="login">LOGIN</button>
      <div class="login-error">${state.loginError}</div>
      <div class="hint-text" style="text-align:center;margin-top:10px;"> Masukkan username &amp; password.</div>
      <div class="login-divider"><span>atau</span></div>
      <button class="btn btn-block" data-action="enter-public">Cek Stok Buku (tanpa login)</button>
    </div>
  </div>`;
}

function doLogin(){
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value.trim();
  if(!u || !p){
    state.loginError = "Pesan error: username/password salah atau kosong.";
    render();
    return;
  }
  state.username = u;
  state.role = state.loginRole;
  state.loggedIn = true;
  state.publicMode = false;
  state.loginError = "";
  goto("dashboard");
}

//profil
function renderProfil(){
  return `
  <div class="page">
    <div class="h-page">Profil Saya</div>
    <div class="profile-card">
      <img class="profile-photo" src="${PROFILE.photo}" alt="Foto profil ${PROFILE.name}">
      <div class="profile-info">
        <div class="name">${PROFILE.name}</div>
        <div class="role">${currentStaffLabel()} — ${BRANCH_LABEL[state.cabang]}</div>
        <div class="profile-detail-row"><div class="k">Username</div><div>${state.username || "-"}</div></div>
        <div class="profile-detail-row"><div class="k">Email</div><div>${PROFILE.email}</div></div>
        <div class="profile-detail-row"><div class="k">No. Telepon</div><div>${PROFILE.phone}</div></div>
        <div class="profile-detail-row"><div class="k">Bergabung sejak</div><div>${PROFILE.joined}</div></div>
      </div>
    </div>
    <div class="hint-text">Data profil ini masih dummy untuk keperluan prototipe.</div>
  </div>`;
}

//Dashboard

function renderDashboardStaff(){
  const cabang = state.cabang;
  const totalJudul = books.length;
  const lowStock = books.filter(b=>isLow(b,cabang));
  const bestSellers = [...books].sort((a,b)=>b.terjual-a.terjual).slice(0,3);

  return `
  <div class="page">
    <div class="h-page">Ringkasan Stok — ${BRANCH_LABEL[cabang]}</div>
    <div class="row">
      <div class="stat-card">
        <div class="label">Total Judul Buku</div>
        <div class="value">${totalJudul}</div>
      </div>
      <div class="stat-card">
        <div class="label">Judul Stok Menipis</div>
        <div class="value">${lowStock.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Buku Terlaris Minggu Ini</div>
        <div class="value">${bestSellers.length}</div>
      </div>
    </div>
    <div class="two-col">
      <div class="panel">
        <div class="h-section">Peringatan Stok Menipis</div>
        <div class="table-wrap">
        <table>
          <thead><tr><th>Kode</th><th>Judul</th><th>Stok</th><th>Status</th></tr></thead>
          <tbody>
            ${lowStock.length ? lowStock.map(b=>`
              <tr>
                <td>${b.kode}</td><td>${b.judul}</td><td>${b.stok[cabang]}</td>
                <td><span class="tag">MENIPIS</span></td>
              </tr>`).join("") : `<tr><td colspan="4" class="muted">Tidak ada stok menipis di cabang ini.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
      <div class="panel">
        <div class="h-section">Buku Terlaris (Rekomendasi)</div>
        <div class="table-wrap">
        <table>
          <thead><tr><th>Kode</th><th>Judul</th><th>Terjual</th></tr></thead>
          <tbody>
            ${bestSellers.map(b=>`<tr><td>${b.kode}</td><td>${b.judul}</td><td>${b.terjual}</td></tr>`).join("")}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>`;
}

function renderDashboardManager(){
  const summaryByBranch = BRANCHES.map(c=>{
    const total = books.length;
    const low = books.filter(b=>isLow(b,c)).length;
    return {cabang:c, total, low};
  });
  const recentActivity = history.slice(0,3);
  const lowAll = [];
  books.forEach(b=>{
    BRANCHES.forEach(c=>{ if(isLow(b,c)) lowAll.push({judul:b.judul, cabang:c, stok:b.stok[c]}); });
  });

  return `
  <div class="page">
    <div class="h-page" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:none;padding-bottom:0;margin-bottom:0;">
      <span style="border-bottom:2px solid var(--line);display:inline-block;padding-bottom:10px;width:100%;">Ringkasan Stok — Semua Cabang</span>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:12px;margin:18px 0;flex-wrap:wrap;">
      <button class="btn btn-primary" data-nav="tambah-judul">+Update — Tambah Judul Baru</button>
      <button class="btn" data-nav="kelola">Tambah / Kurang Stok</button>
    </div>
    <div class="row">
      ${summaryByBranch.map(s=>`
        <div class="stat-card">
          <div class="label">${BRANCH_LABEL[s.cabang]}</div>
          <div class="value">${s.total} judul</div>
          <div class="sub">${s.low} Stok Menipis</div>
        </div>`).join("")}
    </div>
    <div class="two-col">
      <div class="panel">
        <div class="h-section">Aktivitas Perubahan Stok Terbaru</div>
        <div class="table-wrap">
        <table>
          <thead><tr><th>Waktu</th><th>Staff</th><th>Cabang</th><th>Jenis</th><th>Jumlah</th></tr></thead>
          <tbody>
            ${recentActivity.map(h=>`
              <tr><td>${h.waktu}</td><td>${h.staff}</td><td>${h.cabang}</td><td>${h.jenis}</td>
              <td>${typeof h.jumlah==='number' && h.jumlah>0?'+':''}${h.jumlah}</td></tr>`).join("")}
          </tbody>
        </table>
        </div>
      </div>
      <div class="panel">
        <div class="h-section">Notifikasi Stok Menipis (Semua Cabang)</div>
        <div class="table-wrap">
        <table>
          <thead><tr><th>Judul</th><th>Cabang</th><th>Stok</th></tr></thead>
          <tbody>
            ${lowAll.length ? lowAll.map(l=>`
              <tr><td>${l.judul}</td><td>${l.cabang}</td><td><span class="tag">${l.stok}</span></td></tr>`).join("")
              : `<tr><td colspan="3" class="muted">Tidak ada notifikasi.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>`;
}

//Katalog Buku

function renderKatalog(){
  const q = state.katalogQuery.toLowerCase();
  let filtered = books.filter(b =>
    (b.judul.toLowerCase().includes(q) ||
     b.pengarang.toLowerCase().includes(q) ||
     b.kode.toLowerCase().includes(q) ||
     b.kategori.toLowerCase().includes(q)) &&
    (!state.katalogCategory || b.kategori === state.katalogCategory)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if(state.katalogPage > totalPages) state.katalogPage = totalPages;
  const pageItems = filtered.slice((state.katalogPage-1)*PAGE_SIZE, state.katalogPage*PAGE_SIZE);

  return `
  <div class="page">
    <div class="h-page">Katalog Buku</div>
    <div class="search-bar">
      <input type="text" id="katalogSearch" placeholder="Cari judul / pengarang / kode / kategori..." value="${state.katalogQuery}">
      <select id="katalogCategoryFilter">
        <option value="">Semua Kategori</option>
        ${CATEGORIES.map(c=>`<option value="${c}" ${state.katalogCategory===c?'selected':''}>${c}</option>`).join("")}
      </select>
      <button class="btn" data-action="katalog-search">Cari</button>
    </div>
    <div class="small muted" style="margin-bottom:12px;">${filtered.length} buku ditemukan${state.katalogCategory ? ` dalam kategori "${state.katalogCategory}"` : ""}.</div>
    <div class="table-wrap table-wrap-wide">
    <table>
      <thead>
        <tr><th>Kode</th><th>Judul</th><th>Kategori</th><th>Pengarang</th><th>Penerbit</th><th>Harga</th>
        <th>Stok C1</th><th>Stok C2</th><th>Stok C3</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${pageItems.length ? pageItems.map(b=>`
          <tr>
            <td>${b.kode}</td><td>${b.judul}</td><td>${b.kategori}</td><td>${b.pengarang}</td><td>${b.penerbit}</td>
            <td>${rupiah(b.harga)}</td>
            <td>${b.stok.C1}</td><td>${b.stok.C2}</td><td>${b.stok.C3}</td>
            <td>${anyLow(b) ? '<span class="warn-icon">!</span>' : ''}</td>
          </tr>`).join("") : `<tr><td colspan="10" class="muted">Tidak ada buku ditemukan.</td></tr>`}
      </tbody>
    </table>
    </div>
    ${renderPagination(state.katalogPage, totalPages, "katalog-page")}
  </div>`;
}

//Cek Stok di Salah Satu Cabang

function renderCekStok(){
  const q = state.cekStokQuery.toLowerCase();
  const results = q ? books.filter(b=>
    b.judul.toLowerCase().includes(q) || b.pengarang.toLowerCase().includes(q) || b.kategori.toLowerCase().includes(q)
  ) : [];
  const selected = state.cekStokSelected
    ? findBook(state.cekStokSelected)
    : (results.length === 1 ? results[0] : null);
  const showList = q && results.length > 1;
  const bestSellers = [...books].sort((a,b)=>b.terjual-a.terjual).slice(0,3);

  return `
  <div class="page">
    <div class="h-page">Cek Ketersediaan Buku</div>
    <div class="search-bar">
      <input type="text" id="cekStokSearch" placeholder="Cari judul / pengarang / kategori..." value="${state.cekStokQuery}">
      <button class="btn" data-action="cekstok-search">Cari</button>
    </div>

    ${q && results.length === 0 ? `<div class="panel muted">Tidak ada buku ditemukan untuk "${state.cekStokQuery}".</div>` : ""}

    ${showList ? `
      <div class="small muted" style="margin-bottom:12px;">${results.length} buku ditemukan untuk "${state.cekStokQuery}". Pilih salah satu untuk melihat detail:</div>
      <div class="table-wrap" style="margin-bottom:24px;">
      <table>
        <thead><tr><th>Kode</th><th>Judul</th><th>Pengarang</th><th>Kategori</th><th>Stok Cabang Ini</th><th></th></tr></thead>
        <tbody>
          ${results.map(b=>`
            <tr class="${selected && selected.kode===b.kode ? 'row-selected' : ''}">
              <td>${b.kode}</td><td>${b.judul}</td><td>${b.pengarang}</td><td>${b.kategori}</td>
              <td>${b.stok[state.cabang]} ${isLow(b, state.cabang) ? '<span class="tag">MENIPIS</span>' : ''}</td>
              <td><button class="btn btn-sm" data-action="cekstok-select" data-kode="${b.kode}">Lihat Detail</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
      </div>
    ` : ""}

    ${selected ? `
      <div class="book-result">
        ${bookCoverHtml(selected)}
        <div class="info">
          <div class="title">${selected.judul}</div>
          <div class="meta-line">${selected.pengarang} · ${selected.penerbit}</div>
          <div class="meta-line">${selected.kategori}, ${selected.tahun}</div>
          <div class="price-stock">
            Harga: ${rupiah(selected.harga)}
            &nbsp;|&nbsp;
            Stok cabang ini: ${selected.stok[state.cabang]}
            ${isLow(selected, state.cabang) ? ' <span class="tag">MENIPIS</span>' : ' <span class="muted">Aman</span>'}
          </div>
          <button class="btn" data-action="cek-antar-cabang" data-kode="${selected.kode}">Cek Stok Antar Cabang</button>
        </div>
      </div>
    ` : ""}

    <div class="h-section" style="margin-top:8px;">Buku Terlaris (Rekomendasi Ke Pelanggan)</div>
    <div class="rec-grid">
      ${bestSellers.map(b=>`
        <div class="rec-card">
          ${bookCoverHtml(b)}
          <div class="title">${b.judul}</div>
          <div class="sub">${b.pengarang} · ${b.terjual} terjual</div>
        </div>`).join("")}
    </div>
  </div>`;
}

function renderCekStokAntarCabang(){
  const book = findBook(state.cekStokSelected);
  if(!book){
    return `<div class="page"><div class="h-page">Buku tidak ditemukan</div>
      <button class="btn" data-nav="cekstok">&lt; Kembali</button></div>`;
  }
  const allEmpty = BRANCHES.every(c=>book.stok[c] === 0);
  return `
  <div class="page">
    <button class="btn breadcrumb-btn" data-nav="cekstok">&lt; Kembali</button>
    <div class="h-page">Stok Antar Cabang — ${book.judul}</div>
    <div class="row">
      ${BRANCHES.map(c=>{
        const low = isLow(book,c);
        return `
        <div class="stock-cabang-card">
          <div class="label">${BRANCH_LABEL[c].toUpperCase()}</div>
          <div class="value">${book.stok[c]}</div>
          ${book.stok[c] === 0 ? '<span class="tag">STOK KOSONG</span>' : low ? '<span class="tag">DI BAWAH MINIMUM</span>' : '<span class="tag-outline">STOK AMAN</span>'}
        </div>`;
      }).join("")}
    </div>
    ${allEmpty ? '<div class="notice-panel danger"><strong>Stok kosong di semua cabang.</strong></div>' : ''}
  </div>`;
}

//Kelola Stok

function renderKelolaList(){
  const cabang = state.cabang;
  const q = state.kelolaQuery.toLowerCase();
  const filtered = books.filter(b=>
    (b.judul.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q)) &&
    (!state.kelolaCategory || b.kategori === state.kelolaCategory)
  );

  return `
  <div class="page">
    <div class="h-page">Kelola Stok — ${BRANCH_LABEL[cabang]}</div>
    <div class="two-col">
      <div class="panel">
        <div class="h-section" style="border-bottom:none;margin-bottom:8px;">UPDATE — Tambah Judul Buku Baru</div>
        <button class="btn btn-primary btn-block" data-nav="tambah-judul">+ Update / Tambah Judul Baru →</button>
      </div>
      <div class="panel">
        <div class="h-section" style="border-bottom:none;margin-bottom:8px;">TAMBAH / KURANG STOK</div>
        <button class="btn btn-block" data-action="scroll-to-list">Pilih Buku → Tambah / Kurang →</button>
      </div>
    </div>

    <div class="h-section">Daftar Buku di Cabang Ini</div>
    <div class="search-bar">
      <input type="text" id="kelolaSearch" placeholder="Cari judul / kode buku..." value="${state.kelolaQuery}">
      <select id="kelolaCategoryFilter">
        <option value="">Semua Kategori</option>
        ${CATEGORIES.map(c=>`<option value="${c}" ${state.kelolaCategory===c?'selected':''}>${c}</option>`).join("")}
      </select>
      <button class="btn" data-action="kelola-search">Cari</button>
    </div>
    <div class="small muted" style="margin-bottom:12px;">${filtered.length} buku ditemukan${state.kelolaCategory ? ` dalam kategori "${state.kelolaCategory}"` : ""}.</div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>Kode</th><th>Judul</th><th>Pengarang</th><th>Stok</th><th>Min.</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>
        ${filtered.length ? filtered.map(b=>`
          <tr>
            <td>${b.kode}</td><td>${b.judul}</td><td>${b.pengarang}</td>
            <td>${b.stok[cabang]}</td><td>${b.min}</td>
            <td>${isLow(b,cabang) ? '<span class="tag">MENIPIS</span>' : 'Aman'}</td>
            <td><button class="btn btn-sm" data-action="kelola-edit" data-kode="${b.kode}">Tambah / Kurang</button></td>
          </tr>`).join("") : `<tr><td colspan="7" class="muted">Tidak ada buku ditemukan.</td></tr>`}
      </tbody>
    </table>
    </div>
  </div>`;
}

function renderKelolaEdit(){
  const book = findBook(state.kelolaSelected);
  if(!book) return renderKelolaList();
  const cabang = state.cabang;
  const stokSaatIni = book.stok[cabang];
  const jumlah = parseInt(state.jumlahPerubahan, 10);
  const validJumlah = !isNaN(jumlah) && jumlah > 0;
  let hasil = stokSaatIni;
  if(validJumlah){
    hasil = state.jenisPerubahan === "tambah" ? stokSaatIni + jumlah : stokSaatIni - jumlah;
  }
  const bookHistory = history.filter(h=>h.kode===book.kode).slice(0,5);

  return `
  <div class="page">
    <button class="btn breadcrumb-btn" data-nav="kelola">&lt; Kembali</button>
    <div class="h-page">Ubah Jumlah Stok — ${book.judul} (${BRANCH_LABEL[cabang]})</div>
    <div class="two-col">
      <div class="panel">
        <div class="book-meta-card" style="border:none;padding:0;">
          ${bookCoverHtml(book)}
          <div style="font-weight:700;margin-bottom:4px;">${book.kode} — ${book.judul}</div>
          <div class="muted small" style="margin-bottom:12px;">${book.pengarang} | ${book.penerbit}</div>
          <div style="margin-bottom:4px;">Stok saat ini: <strong>${stokSaatIni}</strong> ${isLow(book,cabang)?'<span class="tag">MENIPIS</span>':''}</div>
          <div class="muted small">Batas minimum: ${book.min}</div>
        </div>
        <hr class="hr-dashed">
        <div class="field">
          <label>Jenis Perubahan</label>
          <select id="jenisPerubahan">
            <option value="tambah" ${state.jenisPerubahan==='tambah'?'selected':''}>Tambah Stok (+) — barang masuk</option>
            <option value="kurang" ${state.jenisPerubahan==='kurang'?'selected':''}>Kurang Stok (-) — terjual/rusak/hilang</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Jumlah</label>
            <input type="number" min="1" id="jumlahPerubahan" placeholder="0" value="${state.jumlahPerubahan}">
          </div>
          <div class="field">
            <label>Keterangan (opsional)</label>
            <input type="text" id="keteranganPerubahan" placeholder="mis. barang masuk / retur" value="${state.keteranganPerubahan}">
          </div>
        </div>
        <div class="preview-box">
          Pratinjau hasil: Stok ${stokSaatIni} → <strong>${validJumlah ? hasil : (state.jenisPerubahan==='tambah'?stokSaatIni+' + jumlah':stokSaatIni+' - jumlah')}</strong>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" data-action="kelola-save" data-kode="${book.kode}">Simpan Perubahan</button>
          <button class="btn" data-nav="kelola">Batal</button>
        </div>
        ${state.stockError ? `<div class="error-text">${state.stockError}</div>` : `<div class="hint-text">Pesan error jika jumlah kosong/bukan angka, atau stok jadi negatif saat Kurang Stok.</div>`}
      </div>

      <div class="panel">
        <div class="h-section">Riwayat Perubahan Buku Ini</div>
        <div class="table-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Staff</th><th>Jenis</th><th>Jumlah</th><th>Sesudah</th></tr></thead>
          <tbody>
            ${bookHistory.length ? bookHistory.map(h=>`
              <tr><td>${h.tanggal}</td><td>${h.staff}</td><td>${h.jenis}</td>
              <td>${typeof h.jumlah==='number' && h.jumlah>0?'+':''}${h.jumlah}</td><td>${h.sesudah}</td></tr>`).join("")
              : `<tr><td colspan="5" class="muted">Belum ada riwayat.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>`;
}

function saveStockChange(kode){
  const book = findBook(kode);
  const jumlahRaw = document.getElementById("jumlahPerubahan").value;
  const keterangan = document.getElementById("keteranganPerubahan").value.trim();
  const jenis = document.getElementById("jenisPerubahan").value;
  const jumlah = parseInt(jumlahRaw, 10);
  state.jenisPerubahan = jenis;
  state.jumlahPerubahan = jumlahRaw;
  state.keteranganPerubahan = keterangan;

  if(!jumlahRaw || isNaN(jumlah) || jumlah <= 0){
    state.stockError = "Jumlah tidak boleh kosong dan harus berupa angka positif.";
    render();
    return;
  }
  const cabang = state.cabang;
  const stokSaatIni = book.stok[cabang];
  const hasil = jenis === "tambah" ? stokSaatIni + jumlah : stokSaatIni - jumlah;
  if(hasil < 0){
    state.stockError = "Stok tidak boleh menjadi negatif.";
    render();
    return;
  }
  book.stok[cabang] = hasil;
  const {tanggal, waktu} = nowTimeParts();
  history.unshift({
    tanggal, waktu,
    staff: state.username || (state.role==="manager"?"Manager":"Staff"),
    cabang, kode: book.kode, judul: book.judul,
    jenis: jenis === "tambah" ? "Tambah" : "Kurang",
    jumlah: jenis === "tambah" ? jumlah : -jumlah,
    sebelum: stokSaatIni, sesudah: hasil
  });
  state.stockError = "";
  state.jumlahPerubahan = "";
  state.keteranganPerubahan = "";
  showToast(`Stok "${book.judul}" diperbarui menjadi ${hasil}.`);
  goto("kelola");
}

//Menambah Judul Buku

function renderTambahJudul(){
  const nb = state.newBook;
  return `
  <div class="page">
    <button class="btn breadcrumb-btn" data-nav="kelola">&lt; Kembali</button>
    <div class="h-page">Update Stok — Judul Buku Baru Masuk ke Sistem</div>
    <div class="two-col">
      <div class="panel">
        <div class="h-section">Data Buku</div>
        <div class="field-row">
          <div class="field">
            <label>Kode Buku / ISBN</label>
            <input type="text" id="nb_kode" placeholder="BK-XXX / 978-..." value="${nb.kode}">
          </div>
          <div class="field">
            <label>Kategori</label>
            <select id="nb_kategori">
              <option value="">Pilih Kategori</option>
              ${CATEGORIES.map(c=>`<option value="${c}" ${nb.kategori===c?'selected':''}>${c}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field">
          <label>Judul Buku</label>
          <input type="text" id="nb_judul" placeholder="Masukkan judul buku baru" value="${nb.judul}">
        </div>
        <div class="field-row">
          <div class="field">
            <label>Pengarang</label>
            <input type="text" id="nb_pengarang" placeholder="Nama Pengarang" value="${nb.pengarang}">
          </div>
          <div class="field">
            <label>Penerbit</label>
            <input type="text" id="nb_penerbit" placeholder="Nama Penerbit" value="${nb.penerbit}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Harga (Rp)</label>
            <input type="number" id="nb_harga" placeholder="0" value="${nb.harga}">
          </div>
          <div class="field">
            <label>Tahun Terbit</label>
            <input type="number" id="nb_tahun" placeholder="2026" value="${nb.tahun}">
          </div>
        </div>
        <hr class="hr-dashed">
        <div class="h-section" style="border-bottom:none;">Stok Awal yang Masuk</div>
        <div class="field-row">
          <div class="field">
            <label>Cabang Tujuan</label>
            <select id="nb_cabang">
              ${BRANCHES.map(c=>`<option value="${c}" ${nb.cabangTujuan===c?'selected':''}>${BRANCH_LABEL[c]}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Jumlah Stok Awal</label>
            <input type="number" id="nb_stokawal" placeholder="0" value="${nb.stokAwal}">
          </div>
        </div>
        <div class="field">
          <label>Batas Minimum Stok (untuk notifikasi menipis)</label>
          <input type="number" id="nb_batasmin" placeholder="6" value="${nb.batasMin}">
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" data-action="save-new-book">Simpan Judul Baru</button>
          <button class="btn" data-nav="kelola">Batal</button>
        </div>
        ${state.newBookError ? `<div class="error-text">${state.newBookError}</div>` : `<div class="hint-text">Validasi: kode buku tidak boleh duplikat, judul/pengarang/harga wajib diisi, stok awal tidak boleh negatif.</div>`}
      </div>
      <div class="panel">
        <div class="h-section">Sampul Buku (opsional)</div>
        <div class="ph placeholder-img" style="height:220px;margin-bottom:14px;"></div>
        <button class="btn btn-block" disabled>Unggah Gambar</button>
      </div>
    </div>
  </div>`;
}

function saveNewBook(){
  const nb = state.newBook;
  nb.kode = document.getElementById("nb_kode").value.trim();
  nb.kategori = document.getElementById("nb_kategori").value;
  nb.judul = document.getElementById("nb_judul").value.trim();
  nb.pengarang = document.getElementById("nb_pengarang").value.trim();
  nb.penerbit = document.getElementById("nb_penerbit").value.trim();
  nb.harga = document.getElementById("nb_harga").value;
  nb.tahun = document.getElementById("nb_tahun").value;
  nb.cabangTujuan = document.getElementById("nb_cabang").value;
  nb.stokAwal = document.getElementById("nb_stokawal").value;
  nb.batasMin = document.getElementById("nb_batasmin").value;

  if(!nb.kode || !nb.judul || !nb.pengarang || !nb.harga){
    state.newBookError = "Kode buku, judul, pengarang, dan harga wajib diisi.";
    render(); return;
  }
  if(books.some(b=>b.kode.toLowerCase() === nb.kode.toLowerCase())){
    state.newBookError = "Kode buku sudah terdaftar, gunakan kode lain.";
    render(); return;
  }
  const stokAwal = parseInt(nb.stokAwal || "0", 10);
  if(isNaN(stokAwal) || stokAwal < 0){
    state.newBookError = "Stok awal tidak boleh negatif.";
    render(); return;
  }
  const stokObj = {C1:0,C2:0,C3:0};
  stokObj[nb.cabangTujuan] = stokAwal;
  const newBookEntry = {
    kode: nb.kode, judul: nb.judul, pengarang: nb.pengarang, penerbit: nb.penerbit || "-",
    kategori: nb.kategori || "Umum", harga: parseInt(nb.harga,10) || 0,
    tahun: parseInt(nb.tahun,10) || new Date().getFullYear(),
    stok: stokObj, min: parseInt(nb.batasMin || "5",10), terjual:0
  };
  books.unshift(newBookEntry);
  const {tanggal, waktu} = nowTimeParts();
  history.unshift({
    tanggal, waktu,
    staff: state.username || (state.role==="manager"?"Manager":"Staff"),
    cabang: nb.cabangTujuan, kode: newBookEntry.kode, judul: newBookEntry.judul,
    jenis:"Update (Judul Baru)", jumlah:`stok awal ${stokAwal}`, sebelum:"-", sesudah: stokAwal
  });
  state.newBookError = "";
  state.newBook = { kode:"", kategori:"", judul:"", pengarang:"", penerbit:"", harga:"", tahun:"", cabangTujuan:"C1", stokAwal:"", batasMin:"" };
  showToast(`Judul baru "${newBookEntry.judul}" berhasil ditambahkan.`);
  goto("kelola");
}

//Riwayat Kelola

function renderRiwayat(){
  const f = state.riwayat;
  const from = parseInputDate(f.from), to = parseInputDate(f.to);
  const rangeInvalid = !!(from && to && from > to);
  let filtered = history.filter(h=>{
    if(f.cabang && h.cabang !== f.cabang) return false;
    if(f.staff && h.staff !== f.staff) return false;
    if(f.jenis && !h.jenis.toLowerCase().includes(f.jenis.toLowerCase())) return false;
    const t = parseTanggal(h.tanggal);
    if(from && t < from) return false;
    if(to && t > to) return false;
    return true;
  });
  const staffNames = [...new Set(history.map(h=>h.staff))];

  return `
  <div class="page">
    <div class="h-page">Riwayat Perubahan Stok</div>
    <div class="search-bar">
      <select id="filterCabang">
        <option value="">Cabang ▾</option>
        ${BRANCHES.map(c=>`<option value="${c}" ${f.cabang===c?'selected':''}>${BRANCH_LABEL[c]}</option>`).join("")}
      </select>
      <label class="date-field"><span>Dari</span><input type="date" id="filterFrom" value="${f.from}"></label>
      <label class="date-field"><span>Sampai</span><input type="date" id="filterTo" value="${f.to}"></label>
      <select id="filterStaff">
        <option value="">Nama Staff ▾</option>
        ${staffNames.map(s=>`<option value="${s}" ${f.staff===s?'selected':''}>${s}</option>`).join("")}
      </select>
      <select id="filterJenis">
        <option value="">Jenis: Semua</option>
        <option value="Tambah" ${f.jenis==='Tambah'?'selected':''}>Tambah</option>
        <option value="Kurang" ${f.jenis==='Kurang'?'selected':''}>Kurang</option>
        <option value="Update" ${f.jenis==='Update'?'selected':''}>Update (Judul Baru)</option>
      </select>
      <button class="btn" data-action="riwayat-filter">Terapkan Filter</button>
      <button class="btn btn-ghost" data-action="riwayat-reset">Reset</button>
      <button class="btn" data-action="riwayat-export">Ekspor</button>
    </div>
    ${rangeInvalid ? '<div class="error-text" style="margin:-8px 0 14px;">Tanggal "Dari" tidak boleh lebih besar dari tanggal "Sampai".</div>' : ''}
    <div class="small muted" style="margin-bottom:12px;">${filtered.length} catatan ditemukan.</div>
    <div class="table-wrap table-wrap-wide">
    <table>
      <thead><tr>
        <th>Tanggal</th><th>Waktu</th><th>Staff</th><th>Cabang</th><th>Kode</th><th>Judul</th>
        <th>Jenis</th><th>Jumlah</th><th>Stok Sebelum</th><th>Stok Sesudah</th>
      </tr></thead>
      <tbody>
        ${filtered.length ? filtered.map(h=>`
          <tr>
            <td>${h.tanggal}</td><td>${h.waktu}</td><td>${h.staff}</td><td>${h.cabang}</td>
            <td>${h.kode}</td><td>${h.judul}</td><td>${h.jenis}</td>
            <td>${typeof h.jumlah==='number' && h.jumlah>0?'+':''}${h.jumlah}</td>
            <td>${h.sebelum}</td><td>${h.sesudah}</td>
          </tr>`).join("") : `<tr><td colspan="10" class="muted">Tidak ada data untuk filter ini.</td></tr>`}
      </tbody>
    </table>
    </div>
  </div>`;
}



function renderPagination(current, total, action){
  if(total <= 1) return "";
  let btns = `<button data-action="${action}" data-page="${Math.max(1,current-1)}">&lt;</button>`;
  for(let i=1;i<=total;i++){
    btns += `<button data-action="${action}" data-page="${i}" class="${i===current?'active':''}">${i}</button>`;
  }
  btns += `<button data-action="${action}" data-page="${Math.min(total,current+1)}">&gt;</button>`;
  return `<div class="pagination">${btns}</div>`;
}

//Main Render

function render(){
  const app = document.getElementById("app");
  let html = "";

  if(!state.loggedIn && state.publicMode){
    const body = state.view === "cekstok-detail" ? renderCekStokAntarCabang() : renderCekStok();
    html = renderPublicNavbar() + body;
  } else if(!state.loggedIn){
    html = renderLogin();
  } else {
    let body = "";
    let navKey = state.view;
    switch(state.view){
      case "dashboard":
        body = state.role === "manager" ? renderDashboardManager() : renderDashboardStaff();
        navKey = "dashboard"; break;
      case "katalog": body = renderKatalog(); navKey="katalog"; break;
      case "cekstok": body = renderCekStok(); navKey="cekstok"; break;
      case "cekstok-detail": body = renderCekStokAntarCabang(); navKey="cekstok"; break;
      case "kelola": body = renderKelolaList(); navKey="kelola"; break;
      case "kelola-edit": body = renderKelolaEdit(); navKey="kelola"; break;
      case "tambah-judul": body = renderTambahJudul(); navKey="kelola"; break;
      case "riwayat":
        if(state.role === "manager"){ body = renderRiwayat(); navKey="riwayat"; }
        else { body = renderAccessDenied(); navKey=""; }
        break;
      case "profil": body = renderProfil(); navKey="profil"; break;
      default: body = renderDashboardStaff();
    }
    html = renderNavbar(navKey) + body;
  }

  if(state.toast){
    html += `<div class="toast">${state.toast}</div>`;
  }

  app.innerHTML = html;
  attachEvents();
}

