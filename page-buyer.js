// Halaman pembeli: judul, HTML, dan script klien
module.exports = {
  title: 'Alz Sosmed',
  body: `
<h1 id="ttl">Masuk</h1>
<p class="muted" id="sub"></p>

<section class="box hide" id="auth">
<form id="af" autocomplete="on">
<label for="a_user" style="margin-top:0">Username</label><input id="a_user" autocapitalize="none" autocomplete="username" required>
<label for="a_pass">Password</label><input id="a_pass" type="password" autocomplete="current-password" required>
<p class="muted" id="a_hint" style="margin-top:8px;font-size:.88rem"></p>
<div class="err" id="a_msg" role="alert"></div>
<div id="a_ok" role="status" style="color:var(--accent);font-weight:600;font-size:.92rem"></div>
<button type="submit" id="a_go" style="width:100%">Masuk</button></form>
<p class="muted" style="margin-top:18px;text-align:center"><span id="a_swt"></span> <a href="#" id="a_swl" style="color:var(--accent);font-weight:700"></a></p></section>

<div id="app" class="hide">
<section class="box" id="who"><div class="top"><div><b id="uname"></b><p class="muted" id="ubal"></p></div>
<button class="ghost" id="bout" type="button">Keluar</button></div>
<p class="muted" style="margin-top:10px">Isi saldo lewat menu Deposit.</p></section>

<nav class="tabs" id="mtabs">
<button class="tab" type="button" data-t="sv" aria-selected="true">Layanan</button>
<button class="tab" type="button" data-t="dp" aria-selected="false">Deposit</button></nav>

<div data-p="sv">
<section class="box"><label style="margin-top:0">Platform</label><div class="chips" id="plats"></div>
<label for="cat">Kategori</label><select id="cat" disabled></select></section>

<section class="box"><h2>Layanan</h2><p class="muted" id="cmsg" style="margin-top:6px">Memuat layanan…</p><div id="svs"></div></section>

<form class="box hide" id="bf" autocomplete="off"><h2 id="bname"></h2><p class="muted" id="binfo" style="margin-top:6px"></p>
<label for="b_link">Link target</label><input id="b_link" inputmode="url" autocapitalize="none" placeholder="https://">
<label for="b_qty">Jumlah</label><input id="b_qty" inputmode="numeric">
<p class="muted" style="margin-top:18px">Total bayar</p><div class="total" id="total">Rp 0</div>
<div class="err" id="bmsg" role="status"></div><button type="submit" id="bgo" style="width:100%">Pesan</button></form>

<section class="box" id="ords"><h2>Pesanan saya</h2><div id="olist"></div></section>
</div>

<div data-p="dp" class="hide">
<section class="box"><h2>Cara deposit</h2>
<p class="muted" style="margin-top:6px">Transfer lewat QRIS atau Dana, lalu isi form di bawah. Saldo masuk setelah admin menyetujui.</p>
<div id="pay"></div></section>
<form class="box" id="df" autocomplete="off"><h2>Ajukan deposit</h2>
<label for="d_amt">Jumlah deposit (Rp)</label><input id="d_amt" inputmode="numeric" placeholder="Minimal 10000">
<label for="d_proof">Bukti transfer (foto, disarankan)</label><input id="d_proof" type="file" accept="image/*">
<div class="err" id="dmsg" role="status"></div><button type="submit" id="dgo" style="width:100%">Kirim deposit</button></form>
<section class="box"><h2>Riwayat deposit</h2><div id="dlist" style="margin-top:8px"></div></section>
</div>
</div>`,
  script: `
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const post=(p,b)=>fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
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
 $('#a_msg').textContent='';$('#a_ok').textContent='';head()}
$('#a_swl').onclick=e=>{e.preventDefault();setMode(mode==='in'?'up':'in')};
$('#af').onsubmit=async e=>{e.preventDefault();const go=$('#a_go');go.disabled=true;$('#a_msg').textContent='';$('#a_ok').textContent='';
 try{const d=await post('/api/buyer/'+(mode==='in'?'login':'register'),{username:$('#a_user').value,password:$('#a_pass').value});
  if(!d.status)$('#a_msg').textContent=d.error||'Gagal.';
  else if(mode==='up'){$('#a_pass').value='';setMode('in');$('#a_ok').textContent='Akun Anda berhasil terdaftar. Silakan login.';$('#a_pass').focus()}
  else{$('#a_pass').value='';await loadMe()}}
 catch{$('#a_msg').textContent='Tidak bisa terhubung ke server.'}
 go.disabled=false};

function setMe(u){me=u;
 $('#auth').classList.toggle('hide',!!u);$('#app').classList.toggle('hide',!u);head();
 if(u){$('#uname').textContent=u.username;$('#ubal').textContent='Saldo '+rp(u.balance);loadOrders();if(!loaded)loadCatalog()}}
async function loadMe(){try{const r=await fetch('/api/buyer/me');const d=await r.json();setMe(d.status?d:null)}catch{setMe(null)}}
$('#bout').onclick=async()=>{try{await post('/api/buyer/logout')}catch{}location.reload()};

/* ---------- Tab & Deposit ---------- */
function tab(t){document.querySelectorAll('#app [data-p]').forEach(e=>e.classList.toggle('hide',e.dataset.p!==t));
 document.querySelectorAll('#mtabs .tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)));
 if(t==='dp'){loadPay();loadDeposits();refreshBal()}}
document.querySelectorAll('#mtabs .tab').forEach(b=>b.onclick=()=>tab(b.dataset.t));
async function refreshBal(){try{const r=await fetch('/api/buyer/me');const d=await r.json();if(d.status)$('#ubal').textContent='Saldo '+rp(d.balance)}catch{}}
function img2url(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file);const im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',q))};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Gambar tidak bisa dibaca.'))};im.src=u})}
async function loadPay(){const box=$('#pay');
 try{const r=await fetch('/api/buyer/payment');const d=await r.json();box.textContent='';
  if(!d.status||(!d.qris&&!d.dana)){box.textContent='Metode pembayaran belum diatur admin. Hubungi admin.';return}
  if(d.qris){const i=document.createElement('img');i.src=d.qris;i.alt='QRIS';i.style.cssText='max-width:100%;border-radius:12px;background:#fff;margin-top:12px';box.append(i)}
  if(d.dana){const p=document.createElement('p');p.className='muted';p.style.marginTop='14px';p.textContent='Dana'+(d.dana_name?' a.n. '+d.dana_name:'');
   const n=document.createElement('div');n.className='total';n.textContent=d.dana;
   const c=document.createElement('button');c.type='button';c.className='ghost';c.textContent='Salin nomor';
   c.onclick=async()=>{try{await navigator.clipboard.writeText(d.dana.replace(/[^0-9+]/g,''));c.textContent='Tersalin'}catch{c.textContent='Salin manual'}};
   box.append(p,n,c)}}
 catch{box.textContent='Gagal memuat metode pembayaran.'}}
const DST={pending:['Menunggu persetujuan',''],approved:['Disetujui','var(--accent)'],rejected:['Ditolak','var(--danger)']};
async function loadDeposits(){const box=$('#dlist');
 try{const r=await fetch('/api/buyer/deposits');if(!r.ok)return;const d=await r.json();box.textContent='';
  if(!d.data||!d.data.length){box.textContent='Belum ada deposit.';return}
  d.data.forEach(x=>{const row=document.createElement('div');row.className='ord';
   const v=document.createElement('p');v.style.fontWeight='700';v.textContent=rp(x.amount);
   const m=document.createElement('p');m.className='muted';m.textContent=new Date(x.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
   const s=document.createElement('p');const st=DST[x.status]||[x.status,''];s.style.fontWeight='600';s.style.color=st[1];s.textContent=st[0];
   row.append(v,m,s);box.append(row)})}catch{}}
$('#df').onsubmit=async e=>{e.preventDefault();const m=$('#dmsg');m.style.color='';
 const amt=parseInt($('#d_amt').value,10)||0;
 if(amt<10000){m.textContent='Jumlah deposit minimal Rp 10.000.';return}
 const go=$('#dgo');go.disabled=true;m.textContent='Mengirim…';
 try{const f=$('#d_proof').files[0];const b={amount:amt};if(f)b.proof=await img2url(f,1000,.7);
  const d=await post('/api/buyer/deposit',b);
  if(d.status){m.style.color='var(--accent)';m.textContent='Deposit terkirim. Saldo masuk setelah admin menyetujui.';$('#d_amt').value='';$('#d_proof').value='';loadDeposits()}
  else m.textContent=d.error||'Gagal mengirim deposit.'}
 catch{m.textContent='Gagal mengirim. Coba lagi atau gunakan foto yang lebih kecil.'}
 go.disabled=false};

/* ---------- Katalog (hanya setelah masuk) ---------- */
const plat=c=>{const w=(c||'').trim().split(' ')[0]||'Lainnya';return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()};
function showPlats(){const cnt={};SV.forEach(x=>{const p=plat(x.category);cnt[p]=(cnt[p]||0)+1});
 const box=$('#plats');box.textContent='';const names=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
 names.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=p;b.setAttribute('aria-pressed','false');b.onclick=()=>pickPlat(p);box.append(b)});
 if(names.length)pickPlat(names[0])}
function pickPlat(p){document.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(c.textContent===p)));
 const cats=[...new Set(SV.filter(x=>plat(x.category)===p).map(x=>x.category))];
 const s=$('#cat');s.textContent='';cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;s.append(o)});s.disabled=false;showSvs()}
function showSvs(){const c=$('#cat').value;const box=$('#svs');box.textContent='';sel=null;$('#bf').classList.add('hide');
 const list=SV.filter(x=>x.category===c);$('#cmsg').textContent=list.length+' layanan';
 list.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='svc';b.setAttribute('aria-pressed','false');
  const t=document.createElement('b');t.textContent=x.name;const m=document.createElement('span');m.className='muted';
  m.textContent=rp(x.price)+' per 1000 | min '+x.min+' | maks '+x.max;b.append(t,m);
  b.onclick=()=>{document.querySelectorAll('.svc').forEach(e=>e.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');choose(x)};box.append(b)})}
function choose(x){sel=x;$('#bf').classList.remove('hide');$('#bname').textContent=x.name;$('#binfo').textContent='Jumlah '+x.min+' sampai '+x.max;
 $('#b_qty').value=x.min||'';$('#bmsg').textContent='';calc();$('#bf').scrollIntoView({behavior:'smooth',block:'nearest'})}
function calc(){if(!sel)return;const q=Number($('#b_qty').value)||0;tot=Math.ceil(q*sel.price/1000);$('#total').textContent=rp(tot);
 $('#bmsg').textContent=(q&&(q<sel.min||(sel.max&&q>sel.max)))?'Jumlah harus antara '+sel.min+' dan '+sel.max+'.':''}
$('#cat').onchange=showSvs;$('#b_qty').oninput=calc;
async function loadCatalog(){loaded=true;$('#cmsg').textContent='Memuat layanan…';
 try{const r=await fetch('/api/catalog');if(r.status===401){loaded=false;setMe(null);return}
  const d=await r.json();SV=d.data||[];
  if(!d.status||!SV.length){$('#cmsg').textContent='Belum ada layanan.';return}
  $('#cmsg').textContent='Pilih kategori di atas.';showPlats()}
 catch{loaded=false;$('#cmsg').textContent='Gagal memuat layanan.'}}

/* ---------- Pesan ---------- */
$('#bf').onsubmit=async e=>{e.preventDefault();
 if(!sel)return;const q=Number($('#b_qty').value)||0;
 if(!$('#b_link').value.trim()){$('#bmsg').textContent='Isi link target.';return}
 if(!confirm('Pesan '+q+' untuk '+rp(tot)+'? Saldo Anda akan terpotong.'))return;
 $('#bmsg').textContent='Memproses…';
 try{const d=await post('/api/buyer/order',{service:sel.id,target:$('#b_link').value.trim(),quantity:q});
  if(d.status){$('#bmsg').textContent='Pesanan berhasil dibuat.';$('#b_link').value='';$('#ubal').textContent='Saldo '+rp(d.balance);loadOrders()}
  else $('#bmsg').textContent=d.error||'Gagal memesan.'}
 catch{$('#bmsg').textContent='Tidak bisa terhubung ke server.'}};

async function loadOrders(){const r=await fetch('/api/buyer/orders');if(!r.ok)return;const d=await r.json();const box=$('#olist');box.textContent='';
 if(!d.data||!d.data.length){box.textContent='Belum ada pesanan.';return}
 d.data.forEach(o=>{const row=document.createElement('div');row.className='ord';
  const l1=document.createElement('p');l1.className='muted';l1.textContent='Link target';
  const g=document.createElement('p');g.className='pre';g.style.fontWeight='600';g.textContent=o.target;
  const l2=document.createElement('p');l2.className='muted';l2.style.marginTop='8px';l2.textContent='Total bayar';
  const v=document.createElement('p');v.style.fontWeight='700';v.textContent=rp(o.price);
  row.append(l1,g,l2,v);box.append(row)})}

setMode(location.hash==='#daftar'?'up':'in');
loadMe();`,
};
