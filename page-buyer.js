// Halaman pembeli: judul, HTML, dan script klien
module.exports = {
  title: 'Alzz Pedia',
  body: `
<header class="topbar"><div class="brand"><span class="logo">A</span><span>Alzz Pedia</span></div><button type="button" class="theme-btn" id="themeBtn" aria-label="Ganti tema" title="Ganti tema"><svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg><svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button></header>
<h1 id="ttl">Masuk</h1>
<p class="muted" id="sub"></p>

<section class="box hide" id="auth">
<form id="af" autocomplete="on">
<label for="a_user">Username</label><input id="a_user" autocapitalize="none" autocomplete="username" required>
<label for="a_pass">Password</label><input id="a_pass" type="password" autocomplete="current-password" required>
<label class="remember" id="a_rm"><input type="checkbox" id="a_rem"><span>Ingat saya</span></label>
<div id="a_p2" class="hide"><label for="a_pass2">Ulangi password</label><input id="a_pass2" type="password" autocomplete="new-password"></div>
<p class="muted" id="a_hint" style="margin-top:8px;font-size:.88rem"></p>
<div class="err" id="a_msg" role="alert"></div>
<div id="a_ok" role="status" style="color:var(--accent);font-weight:600;font-size:.92rem"></div>
<button type="submit" id="a_go" style="width:100%">Masuk</button></form>
<p class="muted" style="margin-top:18px;text-align:center"><span id="a_swt"></span> <a href="#" id="a_swl" style="color:var(--accent);font-weight:700"></a></p></section>

<div id="app" class="hide">
<section class="box" id="who"><div class="top"><div><b id="uname"></b><p class="muted" id="ubal"></p></div>
<button class="ghost" id="bout" type="button">Keluar</button></div>
<p class="muted" style="margin-top:10px">Isi saldo lewat menu Deposit.</p></section>
<section class="box hide" id="notice"><h2>Pemberitahuan</h2><p id="notice_t" style="margin-top:6px;white-space:pre-line"></p></section>

<nav class="tabs" id="mtabs">
<button class="tab" type="button" data-t="sv" aria-selected="true">Layanan</button>
<button class="tab" type="button" data-t="rw" aria-selected="false">Riwayat</button>
<button class="tab" type="button" data-t="dp" aria-selected="false">Deposit</button>
<button class="tab" type="button" data-t="pf" aria-selected="false">Profil</button></nav>

<div data-p="sv">
<section class="box hide" id="recbox"><h2>Rekomendasi <span class="badge">Pilihan admin</span></h2><div id="reclist"></div></section>
<section class="box flt"><label class="stp"><span class="step">1</span>Platform</label><div class="chips" id="plats"></div>
<label class="stp" for="cat"><span class="step">2</span>Kategori</label><select id="cat" disabled></select></section>

<section class="box svbox"><div class="top"><h2><span class="step">3</span>Layanan</h2><button class="ghost" id="goords" type="button">Cek Pesanan</button></div><p class="muted" id="cmsg" style="margin-top:6px">Memuat layanan…</p><input id="sq" type="search" placeholder="Cari layanan…" autocomplete="off" aria-label="Cari layanan"><div id="svs"></div></section>

<div class="sheet-ov hide" id="bov"></div>
<form class="box hide" id="bf" autocomplete="off"><div class="sheet-grab"></div>
<div class="top"><div><p class="lbl">Pesan layanan</p><h2 id="bname"></h2></div><button type="button" class="ghost icon-btn" id="bclose" aria-label="Tutup"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<p class="muted" id="binfo"></p>
<label for="b_link">Link target</label><input id="b_link" inputmode="url" autocapitalize="none" placeholder="https://"><p class="note-warn">Akun target tidak boleh diprivat. Pesanan pada akun privat bisa gagal.</p>
<label for="b_qty">Jumlah</label><input id="b_qty" inputmode="numeric">
<div class="total-row"><span class="muted">Total bayar</span><div class="total" id="total">Rp 0</div></div>
<div class="err" id="bmsg" role="status"></div><button type="submit" id="bgo" style="width:100%">Pesan</button></form>

</div>

<div data-p="rw" class="hide">
<section class="box" id="ords">
<div class="seg" id="rseg"><button type="button" class="on" data-v="o">Riwayat Pesanan</button><button type="button" data-v="r">Riwayat Refill</button></div>
<div id="ov"><div class="top"><h2>Pesanan saya</h2><button class="ghost" id="orf" type="button">Segarkan</button></div><div id="olist"></div></div>
<div id="rv" class="hide"><div class="top"><div><h2>Riwayat Refill</h2><p class="muted" id="rtotal"></p></div><button class="ghost" id="rrf" type="button">Segarkan</button></div>
<input id="rq" placeholder="Cari ID atau layanan" autocomplete="off" style="margin-top:10px">
<div class="selbar"><span id="rsel">0 ID</span><button type="button" class="ghost" id="rcopy" disabled>Salin ID Pesanan</button></div>
<div id="rlist"></div></div></section>
</div>

<div data-p="pf" class="hide">
<section class="box"><h2>Akun saya</h2>
<label for="pf_user_v" style="margin-top:10px">Username</label>
<input id="pf_user_v" readonly style="opacity:.85"><p class="muted" style="margin-top:6px">Username tidak bisa diubah.</p></section>
<section class="box"><h2>Ubah password</h2>
<label for="pf_old" style="margin-top:10px">Password lama</label>
<input id="pf_old" type="password" autocomplete="current-password">
<label for="pf_new" style="margin-top:10px">Password baru (minimal 6 karakter)</label>
<input id="pf_new" type="password" autocomplete="new-password">
<label for="pf_new2" style="margin-top:10px">Ulangi password baru</label>
<input id="pf_new2" type="password" autocomplete="new-password">
<button type="button" id="pf_save">Simpan password</button>
<div class="err" id="pf_msg" role="status"></div></section>
</div>

<div data-p="dp" class="hide">
<div id="dv_list">
<section class="box"><h2>Cara deposit</h2>
<ol class="steps"><li><b>1</b><span>Ajukan deposit</span></li><li><b>2</b><span>Pilih metode pembayaran</span></li><li><b>3</b><span>Upload bukti tf</span></li></ol></section>
<form class="box" id="df" autocomplete="off"><h2>Ajukan deposit</h2>
<label for="d_amt">Jumlah deposit (Rp)</label><input id="d_amt" inputmode="numeric" placeholder="Minimal 1000">
<div class="err" id="dmsg" role="status"></div><button type="submit" id="dgo" style="width:100%">Ajukan deposit</button></form>
<section class="box"><h2>Riwayat deposit</h2><div id="dlist" class="muted" style="margin-top:6px"></div></section>
</div>
<div id="dv_pay" class="hide">
<button type="button" class="ghost" id="dback">&larr; Kembali</button>
<section class="box"><h2>Pembayaran</h2>
<label>Pilih metode pembayaran</label><div class="methods" id="methods"></div><div id="pay"></div></section>
<form class="box" id="pf" autocomplete="off"><h2>Upload bukti transfer</h2>
<div class="due"><span class="muted">Jumlah yang harus dibayar</span><b id="dpay_amt"></b></div>
<div id="tut" class="hide" style="margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--field)">
<b style="display:block;font-size:.92rem">Cara unggah bukti transfer</b>
<button type="button" class="qris hide" id="tut_btn" aria-label="Perbesar foto tutorial" style="max-width:340px;margin:10px auto 0"></button>
<p class="muted qris-hint hide" id="tut_hint">Ketuk foto untuk memperbesar</p>
<p id="tut_t" class="hide" style="margin-top:10px;font-size:.9rem;white-space:pre-line"></p></div>
<label class="drop"><input id="d_proof" type="file" accept="image/*"><span id="d_fn">Pilih foto bukti transfer</span></label>
<div class="err" id="pmsg" role="status"></div><button type="submit" id="pgo" style="width:100%">Kirim bukti transfer</button></form>
</div>
</div>
</div>
<p class="help hide" id="help">Butuh bantuan? <a id="help_a" href="#" target="_blank" rel="noopener">Chat Alzz Pedia</a></p>`,
  script: `
/* ---------- Tema terang / gelap (disimpan di perangkat) ---------- */
(function(){const R=document.documentElement,K='ap-theme';
 const sys=()=>matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
 const get=()=>{try{return localStorage.getItem(K)}catch(e){return null}};
 const b=document.getElementById('themeBtn');
 const apply=t=>{R.setAttribute('data-theme',t);if(b){const l=t==='light'?'Ganti ke mode gelap':'Ganti ke mode terang';b.setAttribute('aria-label',l);b.title=l}};
 apply(get()||sys());
 if(b)b.onclick=()=>{const n=R.getAttribute('data-theme')==='light'?'dark':'light';R.classList.add('theme-anim');apply(n);try{localStorage.setItem(K,n)}catch(e){}setTimeout(()=>R.classList.remove('theme-anim'),450)};
})();
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Math.round(Number(n)||0).toLocaleString('id-ID',{maximumFractionDigits:0});
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const fdt=v=>{const d=new Date(v);return isNaN(d)?['','']:d.toLocaleString('sv-SE').split(' ')};
const rp100=n=>'Rp '+Math.ceil((Number(n)||0)/10).toLocaleString('id-ID',{maximumFractionDigits:0}); // harga per 100, tanpa koma
const post=(p,b)=>fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
const note=(el,k,t)=>{el.style.color=k==='ok'?'var(--ok)':k==='info'?'var(--muted)':'';el.textContent=t};
let SV=[],sel=null,tot=0,me=null,loaded=false,mode='in';

/* ---------- Masuk / Daftar ---------- */
function head(){
 $('#ttl').textContent=me?'Pilih layanan':(mode==='in'?'Masuk':'Daftar');
 $('#sub').textContent=me?'Pilih platform, kategori, lalu layanan yang Anda butuhkan.':(mode==='in'?'Masuk untuk melihat layanan dan memesan.':'Buat akun baru untuk mulai memesan.')}
function setMode(m){mode=m;
 $('#a_go').textContent=m==='in'?'Masuk':'Daftar';
 $('#a_pass').autocomplete=m==='in'?'current-password':'new-password';
 $('#a_hint').textContent=m==='in'?'':'Username 3-20 karakter (huruf kecil, angka, atau garis bawah). Password minimal 6 karakter.';
 $('#a_swt').textContent=m==='in'?'Belum punya akun?':'Sudah punya akun?';
 $('#a_swl').textContent=m==='in'?'Daftar':'Masuk';
 $('#a_p2').classList.toggle('hide',m==='in');$('#a_rm').classList.toggle('hide',m==='up');$('#a_pass2').required=(m==='up');$('#a_pass2').value='';
 $('#auth').classList.toggle('up',m==='up');
 $('#a_msg').textContent='';$('#a_ok').textContent='';head()}
$('#a_swl').onclick=e=>{e.preventDefault();setMode(mode==='in'?'up':'in')};
$('#af').onsubmit=async e=>{e.preventDefault();if(mode==='up'&&$('#a_pass').value!==$('#a_pass2').value){$('#a_ok').textContent='';$('#a_msg').textContent='Password dan ulangi password tidak sama.';$('#a_pass2').focus();return}const go=$('#a_go');go.disabled=true;$('#a_msg').textContent='';$('#a_ok').textContent='';
 try{const d=await post('/api/buyer/'+(mode==='in'?'login':'register'),{username:$('#a_user').value,password:$('#a_pass').value,remember:$('#a_rem').checked});
  if(!d.status)$('#a_msg').textContent=d.error||'Gagal.';
  else if(mode==='up'){$('#a_pass').value='';setMode('in');$('#a_ok').textContent='Akun berhasil terdaftar. Silakan login.';$('#a_pass').focus()}
  else{$('#a_pass').value='';await loadMe()}}
 catch{$('#a_msg').textContent='Tidak bisa terhubung ke server.'}
 go.disabled=false};

function setMe(u){me=u;
 $('#auth').classList.toggle('hide',!!u);$('#app').classList.toggle('hide',!u);head();
 if(u){$('#uname').textContent=u.username;$('#ubal').textContent='Saldo '+rp(u.balance);if(!loaded)loadCatalog()}}
async function loadMe(){try{const r=await fetch('/api/buyer/me');const d=await r.json();setMe(d.status?d:null)}catch{setMe(null)}}
$('#bout').onclick=async()=>{try{await post('/api/buyer/logout')}catch{}location.reload()};

/* ---------- Tab & Deposit ---------- */
function tab(t){document.querySelectorAll('#app [data-p]').forEach(e=>e.classList.toggle('hide',e.dataset.p!==t));
 document.querySelectorAll('#mtabs .tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)));
 if(t==='dp'){dview('list');loadDeposits();refreshBal()}
 if(t==='rw')loadOrders();if(t==='pf')$('#pf_user_v').value=$('#uname').textContent}
document.querySelectorAll('#mtabs .tab').forEach(b=>b.onclick=()=>tab(b.dataset.t));
async function refreshBal(){try{const r=await fetch('/api/buyer/me');const d=await r.json();if(d.status)$('#ubal').textContent='Saldo '+rp(d.balance)}catch{}}
function img2url(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file);const im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',q))};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Gambar tidak bisa dibaca.'))};im.src=u})}
function qrisExt(u){const e=u.slice(11,u.indexOf(';'));return e==='jpeg'?'jpg':(e||'png')}
function openQris(u){
 const ov=document.createElement('div');ov.className='lb';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','QRIS');
 const card=document.createElement('div');card.className='lb-card';
 const t=document.createElement('b');t.textContent='Scan QRIS untuk deposit';
 const i=document.createElement('img');i.src=u;i.alt='QRIS';
 const act=document.createElement('div');act.className='lb-act';
 const dl=document.createElement('a');dl.className='btn';dl.href=u;dl.download='qris.'+qrisExt(u);dl.textContent='Download QRIS';
 const cl=document.createElement('button');cl.type='button';cl.className='ghost';cl.textContent='Tutup';
 const key=e=>{if(e.key==='Escape')close()};
 function close(){ov.remove();document.body.style.overflow='';document.removeEventListener('keydown',key)}
 cl.onclick=close;ov.onclick=e=>{if(e.target===ov)close()};document.addEventListener('keydown',key);
 act.append(dl,cl);card.append(t,i,act);ov.append(card);document.body.append(ov);document.body.style.overflow='hidden';cl.focus()}
let curDep=null,payInfo=null,method=null;
function dview(v){$('#dv_list').classList.toggle('hide',v!=='list');$('#dv_pay').classList.toggle('hide',v!=='pay');window.scrollTo(0,0)}
async function openPay(dep){curDep=dep;method=null;$('#dpay_amt').textContent=rp(dep.amount);
 $('#pmsg').textContent='';$('#d_proof').value='';$('#d_fn').textContent='Pilih foto bukti transfer';$('#pay').textContent='';dview('pay');loadTutor();
 const mb=$('#methods');mb.textContent='Memuat…';
 try{const r=await fetch('/api/buyer/payment');const d=await r.json();payInfo=d;mb.textContent='';
  const ms=[];const off=-new Date().getTimezoneOffset(),outWib=off!==420,zn=off===480?'WITA':off===540?'WIT':'luar WIB';
  if(d.status&&d.dana)ms.push(['dana',outWib&&d.qris?'Dana (disarankan)':'Dana']);if(d.status&&d.qris)ms.push(['qris','QRIS']);
  if(!ms.length){mb.textContent='Metode pembayaran belum diatur admin. Hubungi admin.';return}
  ms.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=m[1];b.dataset.k=m[0];b.setAttribute('aria-pressed','false');b.onclick=()=>pickMethod(m[0]);mb.append(b)});
  if(outWib&&d.dana&&d.qris){const w=document.createElement('p');w.className='note-warn';w.style.width='100%';w.textContent='Zona waktu Anda '+zn+' (di luar WIB). Disarankan transfer ke Dana.';mb.append(w)}
  if(ms.length===1)pickMethod(ms[0][0]);else{const h=document.createElement('p');h.className='muted';h.id='mhint';h.style.cssText='width:100%;font-size:.88rem';h.textContent='Pilih Dana atau QRIS.';mb.append(h)}}
 catch{mb.textContent='Gagal memuat metode pembayaran.'}}
function pickMethod(k){method=k;const h=$('#mhint');if(h)h.remove();
 document.querySelectorAll('#methods button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===k)));renderPay()}
function renderPay(){const box=$('#pay');box.textContent='';const d=payInfo||{};
 if(method==='qris'&&d.qris){const q=document.createElement('button');q.type='button';q.className='qris';q.setAttribute('aria-label','Perbesar QRIS');
  const i=document.createElement('img');i.src=d.qris;i.alt='QRIS';q.append(i);q.onclick=()=>openQris(d.qris);
  const h=document.createElement('p');h.className='muted qris-hint';h.textContent='Ketuk QRIS untuk memperbesar';
  const a=document.createElement('a');a.className='btn qris-dl';a.href=d.qris;a.download='qris.'+qrisExt(d.qris);a.textContent='Download QRIS';
  box.append(q,h,a)}
 if(method==='dana'&&d.dana){const dn=document.createElement('div');dn.className='dana';const p=document.createElement('p');p.className='muted';p.textContent='Dana'+(d.dana_name?' a.n. '+d.dana_name:'');
  const n=document.createElement('div');n.className='total';n.textContent=d.dana;
  const c=document.createElement('button');c.type='button';c.className='ghost';c.textContent='Salin nomor';
  c.onclick=async()=>{try{await navigator.clipboard.writeText(d.dana.replace(/[^0-9+]/g,''));c.textContent='Tersalin'}catch{c.textContent='Salin manual'}};
  dn.append(p,n,c);box.append(dn)}}
const DST={pending:['Menunggu persetujuan',''],approved:['Disetujui','var(--accent)'],rejected:['Ditolak','var(--danger)']};
let tutC=null,tutAt=0;
function openTut(u){
 const ov=document.createElement('div');ov.className='lb';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Tutorial unggah bukti transfer');
 const card=document.createElement('div');card.className='lb-card';
 const i=document.createElement('img');i.src=u;i.alt='Tutorial unggah bukti transfer';i.style.maxHeight='78vh';
 const act=document.createElement('div');act.className='lb-act';
 const cl=document.createElement('button');cl.type='button';cl.className='ghost';cl.textContent='Tutup';
 const key=e=>{if(e.key==='Escape')close()};
 function close(){ov.remove();document.body.style.overflow='';document.removeEventListener('keydown',key)}
 cl.onclick=close;ov.onclick=e=>{if(e.target===ov)close()};document.addEventListener('keydown',key);
 act.append(cl);card.append(i,act);ov.append(card);document.body.append(ov);document.body.style.overflow='hidden';cl.focus()}
function drawTutor(d){const btn=$('#tut_btn');btn.textContent='';btn.onclick=null;
 const has=!!d.img;btn.classList.toggle('hide',!has);$('#tut_hint').classList.toggle('hide',!has);
 if(has){const i=document.createElement('img');i.src=d.img;i.alt='Tutorial unggah bukti transfer';i.style.cssText='display:block;width:100%;max-height:260px;object-fit:contain';btn.append(i);btn.onclick=()=>openTut(d.img)}
 $('#tut_t').textContent=d.text||'';$('#tut_t').classList.toggle('hide',!d.text);
 $('#tut').classList.toggle('hide',!(d.text||d.img))}
async function loadTutor(){
 if(tutC&&Date.now()-tutAt<60000){drawTutor(tutC);return}
 try{const r=await fetch('/api/buyer/tutorial');if(!r.ok)return;const d=await r.json();if(!d.status)return;tutC=d;tutAt=Date.now();drawTutor(d)}catch{}}
async function loadDeposits(){const box=$('#dlist');
 try{const r=await fetch('/api/buyer/deposits');if(!r.ok)return;const d=await r.json();box.textContent='';
  if(!d.data||!d.data.length){box.textContent='Belum ada deposit.';return}
  d.data.forEach(x=>{const row=document.createElement('div');row.className='dep';
   const l=document.createElement('div');const v=document.createElement('p');v.className='dv';v.textContent=rp(x.amount);
   const m=document.createElement('p');m.className='muted dd';m.textContent=new Date(x.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});l.append(v,m);
   const s=document.createElement('span');s.className='pill '+x.status;const wait=x.status==='pending'&&!x.has_proof;s.textContent=wait?'Menunggu bukti':(DST[x.status]||[x.status])[0];
   let right=s;if(wait){const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent='Lanjutkan';b.onclick=()=>openPay(x);right=document.createElement('div');right.className='dact';right.append(s,b)}
   row.append(l,right);box.append(row)})}catch{}}
$('#d_proof').addEventListener('change',()=>{const f=$('#d_proof').files[0];$('#d_fn').textContent=f?f.name:'Pilih foto bukti transfer'});
$('#df').onsubmit=async e=>{e.preventDefault();const m=$('#dmsg');m.style.color='';
 const amt=parseInt($('#d_amt').value,10)||0;
 if(amt<1000){m.textContent='Jumlah deposit minimal Rp 1.000.';return}
 const go=$('#dgo');go.disabled=true;note(m,'info','Mengajukan…');
 try{const d=await post('/api/buyer/deposit',{amount:amt});
  if(d.status){m.textContent='';$('#d_amt').value='';loadDeposits();openPay({id:d.id,amount:amt})}
  else note(m,'',d.error||'Gagal mengajukan deposit.')}
 catch{note(m,'','Tidak bisa terhubung ke server.')}
 go.disabled=false};
$('#pf').onsubmit=async e=>{e.preventDefault();const m=$('#pmsg');m.style.color='';
 const f=$('#d_proof').files[0];if(!f){m.textContent='Bukti transfer wajib diunggah.';return}
 if(!curDep)return;const go=$('#pgo');go.disabled=true;note(m,'info','Mengirim…');
 try{const d=await post('/api/buyer/deposit/'+curDep.id+'/proof',{proof:await img2url(f,1000,.7)});
  if(d.status){curDep=null;dview('list');note($('#dmsg'),'ok','Bukti terkirim. Saldo masuk setelah admin menyetujui.');loadDeposits()}
  else note(m,'',d.error||'Gagal mengirim bukti.')}
 catch{note(m,'','Gagal mengirim. Coba lagi atau gunakan foto yang lebih kecil.')}
 go.disabled=false};
$('#dback').onclick=()=>{dview('list');loadDeposits()};

/* ---------- Katalog (hanya setelah masuk) ---------- */
const plat=c=>{const w=(c||'').trim().split(' ')[0]||'Lainnya';return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()};
function showPlats(){const cnt={};SV.forEach(x=>{const p=plat(x.category);cnt[p]=(cnt[p]||0)+1});
 const box=$('#plats');box.textContent='';const names=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
 names.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=p;b.setAttribute('aria-pressed','false');b.onclick=()=>pickPlat(p);box.append(b)});
 if(names.length)pickPlat(names[0])}
function pickPlat(p){document.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(c.textContent===p)));
 const cats=[...new Set(SV.filter(x=>plat(x.category)===p).map(x=>x.category))];
 const s=$('#cat');s.textContent='';cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;s.append(o)});s.disabled=false;$('#sq').value='';showSvs()}
function svcCard(x){const b=document.createElement('div');b.className='svc';b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-pressed','false');
  const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
  const pr=mk('span','sv-price',rp100(x.price));pr.append(mk('small','',' / 100'));
  const mt=mk('div','sv-meta');mt.append(mk('span','sv-min','Min '+Number(x.min).toLocaleString('id-ID')),mk('span','sv-chip','Maks '+Number(x.max).toLocaleString('id-ID')));
  b.title=x.name;b.append(mk('b','',x.name),pr,mt,mk('span','sv-btn','Pesan Sekarang'));
  const go=()=>{document.querySelectorAll('.svc').forEach(e=>e.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');choose(x)};
  b.onclick=go;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};return b}
function showRec(ids){const box=$('#reclist');box.textContent='';
 const list=ids.map(i=>SV.find(x=>x.id===i)).filter(Boolean);
 $('#recbox').classList.toggle('hide',!list.length);
 list.forEach((x,i)=>{const c=svcCard(x);c.style.setProperty('--i',Math.min(i,14));box.append(c)})}
let svList=[],svN=0,svIO=null;
function moreSvs(){const box=$('#svs');const old=box.querySelector('.sv-more');if(old)old.remove();
 const f=document.createDocumentFragment(),end=Math.min(svN+36,svList.length);
 for(let i=svN;i<end;i++){const c=svcCard(svList[i]);c.style.setProperty('--i',Math.min(i-svN,12));f.append(c)}
 svN=end;box.append(f);
 if(svN<svList.length){const m=el('div','sv-more');box.append(m);
  if('IntersectionObserver' in window){if(svIO)svIO.disconnect();svIO=new IntersectionObserver(es=>{if(es[0].isIntersecting)moreSvs()},{rootMargin:'700px'});svIO.observe(m)}
  else moreSvs()}}
function showSvs(){const c=$('#cat').value,q=($('#sq').value||'').trim().toLowerCase();const box=$('#svs');box.textContent='';sel=null;$('#bf').classList.add('hide');$('#bov').classList.add('hide');document.body.classList.remove('lock');
 if(svIO){svIO.disconnect();svIO=null}
 const all=SV.filter(x=>x.category===c).sort((a,b)=>(Number(a.price)||1e18)-(Number(b.price)||1e18));
 svList=q?all.filter(x=>(x.name+' '+x.id).toLowerCase().indexOf(q)>-1):all;svN=0;
 $('#cmsg').textContent=q?svList.length+' dari '+all.length+' layanan':all.length+' layanan';
 if(!svList.length){box.append(el('p','muted sv-empty',q?'Tidak ada layanan yang cocok.':'Belum ada layanan.'));return}
 moreSvs()}

function choose(x){sel=x;$('#bf').classList.remove('hide');$('#bname').textContent=x.name;$('#binfo').textContent='Jumlah '+x.min+' sampai '+x.max;
 $('#b_qty').value=x.min||'';$('#bmsg').textContent='';calc();$('#bov').classList.remove('hide');document.body.classList.add('lock')}
function closeSheet(){$('#bf').classList.add('hide');$('#bov').classList.add('hide');document.body.classList.remove('lock');sel=null;
 document.querySelectorAll('.svc').forEach(e=>e.setAttribute('aria-pressed','false'))}
function toast(t){const o=document.querySelector('.toast');if(o)o.remove();const e=el('div','toast',t);e.setAttribute('role','status');document.body.append(e);setTimeout(()=>e.remove(),2600)}
$('#bclose').onclick=closeSheet;$('#bov').onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#bf').classList.contains('hide')&&!document.querySelector('.lb'))closeSheet()});
const SL={pending:'Pending',processing:'Diproses',success:'Sukses',partial:'Sebagian',error:'Error'};
function calc(){if(!sel)return;const q=Number($('#b_qty').value)||0;tot=Math.ceil(q*sel.price/1000);$('#total').textContent=rp(tot);
 note($('#bmsg'),'',(q&&(q<sel.min||(sel.max&&q>sel.max)))?'Jumlah harus antara '+sel.min+' dan '+sel.max+'.':'')}
$('#cat').onchange=()=>{$('#sq').value='';showSvs()};$('#b_qty').oninput=calc;let sqT=0;$('#sq').oninput=()=>{clearTimeout(sqT);sqT=setTimeout(showSvs,180)};
async function loadCatalog(){loaded=true;$('#cmsg').textContent='Memuat layanan…';
 try{const r=await fetch('/api/catalog');if(r.status===401){loaded=false;setMe(null);return}
  const d=await r.json();SV=d.data||[];
  if(!d.status||!SV.length){$('#cmsg').textContent='Belum ada layanan.';return}
  $('#cmsg').textContent='Pilih kategori di atas.';showPlats();showRec(d.rec||[])}
 catch{loaded=false;$('#cmsg').textContent='Gagal memuat layanan.'}}

/* ---------- Pesan ---------- */
$('#bf').onsubmit=async e=>{e.preventDefault();
 if(!sel)return;const q=Number($('#b_qty').value)||0;
 if(!$('#b_link').value.trim()){note($('#bmsg'),'','Isi link target.');return}
 if(!confirm('Pesan '+q+' untuk '+rp(tot)+'? Saldo Anda akan terpotong.'))return;
 note($('#bmsg'),'info','Memproses…');
 try{const d=await post('/api/buyer/order',{service:sel.id,target:$('#b_link').value.trim(),quantity:q});
  if(d.status){note($('#bmsg'),'ok',d.queued?'Pesanan diterima dengan status Pending. Akan diproses otomatis.':'Pesanan berhasil dibuat.');$('#b_link').value='';$('#ubal').textContent='Saldo '+rp(d.balance);loadOrders();toast(d.queued?'Pesanan diterima, status Pending':'Pesanan berhasil dibuat');setTimeout(closeSheet,700)}
  else note($('#bmsg'),'',d.error||'Gagal memesan.')}
 catch{note($('#bmsg'),'','Tidak bisa terhubung ke server.')}};

function stInfo(s){const t=String(s||'').toLowerCase();
 if(!t||t==='queued'||t==='sending'||t.indexOf('pend')>-1||t.indexOf('wait')>-1)return['Pending','pending'];
 if(t.indexOf('part')>-1)return['Sebagian','part'];
 if(t.indexOf('succ')>-1||t.indexOf('complet')>-1||t.indexOf('sukses')>-1||t.indexOf('selesai')>-1||t.indexOf('done')>-1)return['Sukses','ok'];
 if(t.indexOf('err')>-1||t.indexOf('fail')>-1||t.indexOf('gagal')>-1||t.indexOf('cancel')>-1||t.indexOf('refund')>-1||t.indexOf('reject')>-1)return['Error','bad'];
 if(t.indexOf('proc')>-1||t.indexOf('progress')>-1||t.indexOf('run')>-1)return['Diproses','proc'];
 return[String(s),'pending']}
function setBadge(el,s){const i=stInfo(s);el.textContent=i[0];el.className='st st-'+i[1];return i[1]!=='pending'&&i[1]!=='proc'}
async function checkOrder(id,badge,btn,row){if(btn){btn.disabled=true;btn.textContent='Mengecek…'}
 let fin=false;
 try{const d=await post('/api/buyer/status',{id});
  if(d.status){fin=setBadge(badge,d.state);if(fin&&row&&['ok','part'].indexOf(stInfo(d.state)[1])>-1)addRefillBtn(row,id);if(btn){if(fin)btn.remove();else{btn.disabled=false;btn.textContent='Cek status'}}}
  else if(btn){btn.disabled=false;btn.textContent='Cek status'}}
 catch{if(btn){btn.disabled=false;btn.textContent='Cek status'}}
 return fin}
function addCancelBtn(row,id){if(row.querySelector('.cx'))return;
 const b=document.createElement('button');b.type='button';b.className='ghost cx';b.textContent='Batalkan pesanan';
 const m=document.createElement('p');m.className='muted';m.style.cssText='margin-top:6px;font-size:.88rem';
 b.onclick=async()=>{if(!confirm('Batalkan pesanan ini? Saldo dikembalikan jika berhasil.'))return;b.disabled=true;m.style.color='';m.textContent='Memproses...';
  try{const d=await post('/api/buyer/cancel',{id});m.style.color=d.status?'var(--ok)':'var(--danger)';m.textContent=d.status?d.message:(d.error||'Gagal membatalkan.');
   if(d.status){refreshBal();setTimeout(loadOrders,900)}else b.disabled=false}
  catch{m.style.color='var(--danger)';m.textContent='Tidak bisa terhubung ke server.';b.disabled=false}};
 row.append(b,m)}
function addRefillBtn(row,id){if(row.querySelector('.rf'))return;
 const b=document.createElement('button');b.type='button';b.className='ghost rf';b.textContent='Ajukan refill';
 const m=document.createElement('p');m.className='muted';m.style.cssText='margin-top:6px;font-size:.88rem';
 b.onclick=async()=>{if(!confirm('Ajukan refill untuk pesanan ini?'))return;b.disabled=true;m.style.color='';m.textContent='Mengirim…';
  try{const d=await post('/api/buyer/refill',{id});m.style.color=d.status?'var(--ok)':'var(--danger)';m.textContent=d.status?(d.message||'Refill diajukan.'):(d.error||'Refill gagal.')}
  catch{m.style.color='var(--danger)';m.textContent='Tidak bisa terhubung ke server.'}
  b.disabled=false};
 row.append(b,m)}
let oseq=0;
async function loadOrders(){const r=await fetch('/api/buyer/orders');if(!r.ok)return;const d=await r.json();const box=$('#olist');box.textContent='';
 const mine=++oseq;
 if(!d.data||!d.data.length){box.textContent='Belum ada pesanan.';return}
 const todo=[];
 d.data.forEach(o=>{const row=document.createElement('div');row.className='ord';
  row.className='ord rc';const bg=el('span');const fin=setBadge(bg,o.status);
  const tp=el('div','rc-top');tp.append(el('span','rc-chip','#'+o.id),bg);
  const dt=fdt(o.created_at),mt=el('div','rc-meta');
  mt.append(el('p','rc-lbl',dt[0]?'TANGGAL/WAKTU':'TOTAL'),el('b','',dt[0]||rp(o.price)),el('small','',dt[0]?dt[1]:''));
  row.append(tp,el('p','rc-name',o.service_name||'Pesanan #'+o.id),el('p','pre muted',o.target),el('p','rc-info',(o.quantity?'Jumlah '+Number(o.quantity).toLocaleString('id-ID')+'  |  ':'')+rp(o.price)));
  if(dt[0])row.append(mt);
  if(!fin){const c=document.createElement('button');c.type='button';c.className='ghost';c.textContent='Cek status';
   c.onclick=()=>checkOrder(o.id,bg,c,row);row.append(c);todo.push([o.id,bg,c,row])}
  else if(['ok','part'].indexOf(stInfo(o.status)[1])>-1)addRefillBtn(row,o.id)
  if(stInfo(o.status)[1]==='pending')addCancelBtn(row,o.id);
  box.append(row)});
 for(const t of todo.slice(0,10)){if(mine!==oseq)break;await checkOrder(t[0],t[1],t[2],t[3])}}
$('#orf').onclick=loadOrders;
$('#goords').onclick=()=>tab('rw');
/* ---------- Profil: ganti password ---------- */
$('#pf_save').onclick=async()=>{const m=$('#pf_msg'),o=$('#pf_old').value,n=$('#pf_new').value,c=$('#pf_new2').value;
 const say=(ok,t)=>{m.style.color=ok?'var(--ok)':'var(--danger)';m.textContent=t};
 if(!o||!n||!c){say(false,'Isi semua kolom.');return}
 if(n!==c){say(false,'Konfirmasi password tidak sama.');return}
 const b=$('#pf_save');b.disabled=true;
 try{const d=await post('/api/buyer/password',{old:o,next:n});
  if(d.status){say(true,'Password berhasil diubah.');['#pf_old','#pf_new','#pf_new2'].forEach(x=>{$(x).value=''})}
  else say(false,d.error||'Gagal mengubah password.')}catch{say(false,'Koneksi bermasalah, coba lagi.')}b.disabled=false};

/* ---------- Riwayat Refill ---------- */
let RF=[];
function updSel(){const n=document.querySelectorAll('.rc-cb:checked').length;$('#rsel').textContent=n+' ID';$('#rcopy').disabled=!n}
function drawRefills(){const q=$('#rq').value.trim().toLowerCase(),box=$('#rlist');box.textContent='';$('#rtotal').textContent='Total data: '+RF.length;
 const list=RF.filter(x=>!q||('#'+x.id+' '+x.order_id+' '+x.refill_id+' '+x.service_name).toLowerCase().indexOf(q)>-1);
 if(!list.length){box.append(el('p','muted',RF.length?'Tidak ada hasil.':'Belum ada refill.'));updSel();return}
 list.forEach(x=>{const c=el('div','rc'),tp=el('div','rc-top'),cb=document.createElement('input');cb.type='checkbox';cb.className='rc-cb';cb.dataset.id=x.order_id;cb.onchange=updSel;
  const bg=el('span');setBadge(bg,x.status);tp.append(cb,el('span','rc-chip','#'+(x.refill_id||x.id)),bg);
  const dt=fdt(x.created_at),mt=el('div','rc-meta');mt.append(el('p','rc-lbl','TANGGAL/WAKTU'),el('b','',dt[0]),el('small','',dt[1]));
  const sy=el('button','ghost','Cek status');sy.type='button';
  sy.onclick=async()=>{sy.disabled=true;try{const d=await post('/api/buyer/refill-status',{id:x.id});if(d.status){x.status=d.state;setBadge(bg,d.state)}}catch{}sy.disabled=false};
  c.append(tp,el('p','rc-lbl','ID PESANAN'),el('span','rc-chip','#'+x.order_id),el('p','rc-name',x.service_name||('Pesanan #'+x.order_id)));
  if(dt[0])c.append(mt);c.append(sy);box.append(c)});updSel()}
async function loadRefills(){try{const r=await fetch('/api/buyer/refills');if(!r.ok)return;const d=await r.json();RF=d.data||[];drawRefills()}catch{}}
document.querySelectorAll('#rseg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#rseg button').forEach(x=>x.classList.toggle('on',x===b));
 $('#ov').classList.toggle('hide',b.dataset.v!=='o');$('#rv').classList.toggle('hide',b.dataset.v!=='r');if(b.dataset.v==='r')loadRefills();else loadOrders()});
$('#rrf').onclick=loadRefills;$('#rq').oninput=drawRefills;
$('#rcopy').onclick=async()=>{const ids=[...document.querySelectorAll('.rc-cb:checked')].map(e=>e.dataset.id).join('\\n');
 try{await navigator.clipboard.writeText(ids);$('#rcopy').textContent='Tersalin'}catch{$('#rcopy').textContent='Gagal menyalin'}setTimeout(()=>{$('#rcopy').textContent='Salin ID Pesanan'},1500)};


fetch('/api/announce').then(r=>r.json()).then(d=>{if(d&&d.status&&d.text){$('#notice_t').textContent=d.text;$('#notice').classList.remove('hide')}}).catch(()=>{});
fetch('/api/wa').then(r=>r.json()).then(d=>{if(d&&d.status&&d.wa){$('#help_a').href='https://wa.me/'+d.wa;$('#help').classList.remove('hide')}}).catch(()=>{});
setMode(location.hash==='#daftar'?'up':'in');
// "Cara deposit" dilipat supaya tab Deposit tidak panjang (ketuk judulnya untuk membuka)
document.querySelectorAll('[data-p="dp"]>section.box').forEach(b=>{const h=b.querySelector(':scope>h2');if(h&&h.textContent==='Cara deposit'){b.classList.add('fold','closed');h.onclick=()=>b.classList.toggle('closed')}});

loadMe();`,
};
