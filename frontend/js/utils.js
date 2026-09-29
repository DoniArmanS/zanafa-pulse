

function rupiah(n){
  return "Rp " + Number(n).toLocaleString("id-ID");
}
function isLow(book, cabang){
  return book.stok[cabang] <= book.min;
}
function anyLow(book){
  return BRANCHES.some(c => isLow(book, c));
}
function currentStaffLabel(){
  return state.role === "manager" ? "Manager" : "Staff";
}
function showToast(msg){
  state.toast = msg;
  render();
  setTimeout(()=>{ state.toast=null; render(); }, 2200);
}
function nowTimeParts(){
  const d = new Date();
  const pad = x => String(x).padStart(2,"0");
  return {
    tanggal: `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)}`,
    waktu: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}
// "dd/mm/yy" (format riwayat) -> Date
function parseTanggal(s){
  const [d,m,y] = String(s).split("/").map(Number);
  return new Date(2000 + y, m - 1, d);
}
// "yyyy-mm-dd" (nilai input type=date) -> Date, atau null kalau kosong
function parseInputDate(v){
  if(!v) return null;
  const [y,m,d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function findBook(kode){
  return books.find(b=>b.kode===kode);
}
// Returns real cover art when a book has one, otherwise the generic placeholder.
function bookCoverHtml(book, extraClass){
  const extra = extraClass ? " " + extraClass : "";
  if(book && book.cover){
    return `<img class="ph book-cover-img${extra}" src="${book.cover}" alt="Sampul buku ${book.judul}" onerror="this.outerHTML='<div class=\\'ph placeholder-img${extra}\\'></div>';">`;
  }
  return `<div class="ph placeholder-img${extra}"></div>`;
}
function goto(view, extra){
  state.view = view;
  if(extra) Object.assign(state, extra);
  window.scrollTo(0,0);
  render();
}

