// Halaman dasbor admin: judul, HTML, dan script klien
module.exports = {
  title: 'Dasbor admin',
  body: `
<div class="top"><h1>Dasbor admin</h1><button class="ghost" id="logout" type="button">Keluar</button></div>
<nav class="tabs">
<button class="tab" type="button" data-t="home" aria-selected="true">Ringkasan</button>
<button class="tab" type="button" data-t="dp" id="dtab" aria-selected="false">Deposit</button>
<button class="tab" type="button" data-t="us" aria-selected="false">Pembeli</button>
<button class="tab" type="button" data-t="pay" aria-selected="false">Pembayaran</button>
<button class="tab" type="button" data-t="set" aria-selected="false">Pengaturan</button></nav>

<div data-p="home">
<section class="box"><p class="muted">Saldo Sprint Pedia</p><div class="saldo" id="saldo">…</div>
<p class="muted" id="provider"></p><button class="ghost" id="refresh" type="button" style="margin-top:14px">Segarkan saldo</button></section>
<section class="box"><p class="muted">Deposit menunggu persetujuan</p><div class="saldo" id="pcount">…</div>
<button class="ghost" id="godp" type="button" style="margin-top:14px">Lihat deposit</button></section></div>

<div data-p="dp" class="hide">
<section class="box"><h2>Menunggu persetujuan</h2><div id="dpend" style="margin-top:8px"></div></section>
<section class="box"><h2>Riwayat terbaru</h2><div id="ddone" style="margin-top:8px"></div></section></div>

<div data-p="us" class="hide">
<form class="box" id="tform" autocomplete="off"><h2>Tambah saldo pembeli</h2>
<label for="t_user">Username pembeli</label><input id="t_user" autocapitalize="none" required>
<label for="t_amt">Jumlah (Rp, boleh minus untuk mengurangi)</label><input id="t_amt" inputmode="numeric" required>
<div class="err" id="tmsg" role="status"></div><button type="submit">Simpan saldo</button></form>
<section class="box"><h2>Daftar pembeli</h2>
<input id="uq" placeholder="Cari username" style="margin-top:12px" autocomplete="off">
<div id="ulist" style="margin-top:8px"></div></section></div>

<div data-p="pay" class="hide">
<form class="box" id="payf" autocomplete="off"><h2>Pengaturan pembayaran</h2>
<p class="muted" style="margin-top:6px">Ditampilkan ke pembeli di menu Deposit.</p>
<label for="p_dana">Nomor Dana</label><input id="p_dana" inputmode="tel" placeholder="08xxxxxxxxxx">
<label for="p_name">Atas nama</label><input id="p_name">
<label for="p_qris">Foto QRIS</label><input id="p_qris" type="file" accept="image/*">
<div id="p_prev" style="margin-top:12px"></div>
<button type="button" class="ghost hide" id="p_del">Hapus foto QRIS</button>
<div class="err" id="p_msg" role="status"></div><button type="submit" style="width:100%">Simpan pembayaran</button></form></div>

<div data-p="set" class="hide">
<form class="box" id="form" autocomplete="off"><h2>Key Sprint Pedia</h2>
<p class="muted" style="margin-top:6px">Kosongkan kolom yang tidak ingin diubah.</p>
<label for="secret_key">Secret key</label><input id="secret_key" type="password" autocomplete="off">
<label for="api_key">API key</label><input id="api_key" type="password" autocomplete="off">
<label for="markup">Markup harga untuk pembeli (%)</label><input id="markup" inputmode="decimal">
<div class="err" id="msg" role="status"></div><button type="submit">Simpan pengaturan</button></form>
<section class="box"><h2>Layanan untuk pembeli</h2>
<p class="muted" style="margin-top:6px">Impor daftar layanan dari Sprint Pedia agar tampil di halaman pembeli.</p>
<button type="button" id="loadsv">Impor semua layanan</button><div class="err" id="svmsg" role="status"></div></section></div>`,
  script: `
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
async function api(p,o){const r=await fetch(p,o);if(r.status===401){location.href='/login';throw new Error('401')}return r.json()}
const post=(p,b)=>api(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});
const errOf=d=>typeof d.data==='string'?d.data:(d.error||'Terjadi kesalahan.');
const when=s=>new Date(s).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
const say=(el,ok,t)=>{el.style.color=ok?'var(--accent)':'';el.textContent=t};
const btn=(t,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className=cls||'';b.textContent=t;b.onclick=fn;return b};
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});

function tab(t){document.querySelectorAll('[data-p]').forEach(e=>e.classList.toggle('hide',e.dataset.p!==t));
 document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)));
 if(t==='dp')loadDeposits();if(t==='us')loadUsers()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>tab(b.dataset.t));
$('#godp').onclick=()=>tab('dp');
function item(t,sub,fn){const b=document.createElement('button');b.type='button';b.className='item';
 const a=document.createElement('b');a.textContent=t;const c=document.createElement('span');c.className='muted';c.textContent=sub;b.append(a,c);b.onclick=fn;return b}
function img2url(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file);const im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',q))};
 im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Gambar tidak bisa dibaca.'))};im.src=u})}

/* ---------- Ringkasan & pengaturan ---------- */
async function balance(){$('#provider').textContent='Mengambil saldo…';
 try{const d=await api('/api/profile');
  if(d.status){$('#saldo').textContent=rp(d.data.balance);$('#provider').textContent='Terhubung sebagai '+d.data.username}
  else{$('#saldo').textContent='—';$('#provider').textContent=errOf(d)}}catch{}}
$('#refresh').onclick=balance;
async function init(){const d=await api('/api/settings');
 $('#secret_key').placeholder=d.secret_key||'Belum diisi';$('#api_key').placeholder=d.api_key||'Belum diisi';$('#markup').value=d.markup_percent||'0';
 if(d.secret_key&&d.api_key)balance();else{$('#saldo').textContent='—';$('#provider').textContent='Isi key di tab Pengaturan.'}}
$('#form').onsubmit=async e=>{e.preventDefault();
 const d=await post('/api/settings',{secret_key:$('#secret_key').value.trim(),api_key:$('#api_key').value.trim(),markup_percent:$('#markup').value.trim()});
 say($('#msg'),d.ok,d.ok?'Pengaturan tersimpan.':errOf(d));
 if(d.ok){$('#secret_key').value='';$('#api_key').value='';init()}};
$('#loadsv').onclick=async()=>{const m=$('#svmsg');say(m,true,'Mengimpor semua layanan, tunggu sebentar…');
 try{const d=await post('/api/services/sync');d.status?say(m,true,d.count+' layanan berhasil diimpor.'):say(m,false,errOf(d))}catch{}};

/* ---------- Deposit ---------- */
function depRow(x,pending){const row=document.createElement('div');row.className='ord';
 const a=document.createElement('b');a.textContent=x.username;
 const v=document.createElement('p');v.style.fontWeight='700';v.textContent=rp(x.amount);
 const m=document.createElement('p');m.className='muted';m.textContent=when(x.created_at);row.append(a,v,m);
 if(!pending){const s=document.createElement('p');s.style.fontWeight='600';s.style.color=x.status==='approved'?'var(--accent)':'var(--danger)';
  s.textContent=x.status==='approved'?'Disetujui':'Ditolak';row.append(s);return row}
 const bar=document.createElement('div');bar.className='row';
 if(x.has_proof){const pb=btn('Lihat bukti','ghost',async()=>{
  const old=row.querySelector('img');if(old){old.remove();pb.textContent='Lihat bukti';return}
  pb.disabled=true;try{const d=await api('/api/admin/deposits/'+x.id+'/proof');
   if(d.proof){const i=document.createElement('img');i.src=d.proof;i.alt='Bukti transfer';i.style.cssText='max-width:100%;border-radius:12px;margin-top:12px;display:block';row.append(i);pb.textContent='Sembunyikan bukti'}
   else alert(errOf(d))}catch{}pb.disabled=false});bar.append(pb)}
 const ok=btn('Setujui','',async()=>{
  if(!confirm('Setujui deposit '+rp(x.amount)+' untuk '+x.username+'? Saldo langsung masuk ke akun pembeli.'))return;
  ok.disabled=no.disabled=true;
  try{const d=await post('/api/admin/deposits/'+x.id+'/approve');if(!d.status)alert(errOf(d));loadDeposits();loadUsers()}catch{ok.disabled=no.disabled=false}});
 const no=btn('Tolak','ghost',async()=>{
  if(!confirm('Tolak deposit '+rp(x.amount)+' dari '+x.username+'?'))return;
  ok.disabled=no.disabled=true;
  try{const d=await post('/api/admin/deposits/'+x.id+'/reject');if(!d.status)alert(errOf(d));loadDeposits()}catch{ok.disabled=no.disabled=false}});
 bar.append(ok,no);row.append(bar);return row}
async function loadDeposits(){
 try{const [p,h]=await Promise.all([api('/api/admin/deposits'),api('/api/admin/deposits?status=done')]);
  const pe=$('#dpend'),dn=$('#ddone');pe.textContent='';dn.textContent='';
  const n=p.data?p.data.length:0;$('#pcount').textContent=n;$('#dtab').textContent=n?'Deposit ('+n+')':'Deposit';
  if(!p.status)pe.textContent=errOf(p);else if(!n)pe.textContent='Tidak ada deposit yang menunggu.';else p.data.forEach(x=>pe.append(depRow(x,true)));
  if(!h.status)dn.textContent=errOf(h);else if(!h.data.length)dn.textContent='Belum ada riwayat.';else h.data.forEach(x=>dn.append(depRow(x,false)))}catch{}}

/* ---------- Pembeli ---------- */
async function loadUsers(){const d=await api('/api/admin/users?q='+encodeURIComponent($('#uq').value.trim()));const box=$('#ulist');box.textContent='';
 if(!d.status){box.textContent=errOf(d);return}
 if(!d.data.length){box.textContent='Belum ada pembeli.';return}
 d.data.forEach(u=>{const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;border-top:1px solid var(--line)';
  const it=item(u.username,'Saldo '+rp(u.balance),()=>{$('#t_user').value=u.username;$('#t_amt').focus()});it.style.cssText='flex:1;min-width:0;border-top:0';
  const del=document.createElement('button');del.type='button';del.className='ghost';del.textContent='Hapus';del.style.cssText='width:auto;padding:8px 12px;color:var(--danger);border-color:var(--danger)';
  del.onclick=async()=>{if(!confirm('Hapus pembeli '+u.username+'? Saldo, riwayat pesanan, dan riwayat deposit pembeli ini ikut terhapus. Tidak bisa dibatalkan.'))return;
   del.disabled=true;try{const d=await post('/api/admin/users/delete',{username:u.username});if(d.status)loadUsers();else{alert(errOf(d));del.disabled=false}}catch{del.disabled=false}};
  row.append(it,del);box.append(row)})}
let tm;$('#uq').oninput=()=>{clearTimeout(tm);tm=setTimeout(loadUsers,300)};
$('#tform').onsubmit=async e=>{e.preventDefault();
 const d=await post('/api/admin/topup',{username:$('#t_user').value.trim(),amount:$('#t_amt').value.trim()});
 say($('#tmsg'),d.status,d.status?('Berhasil. Saldo sekarang '+rp(d.balance)):errOf(d));
 if(d.status){$('#t_amt').value='';loadUsers()}};

/* ---------- Pembayaran (QRIS & Dana) ---------- */
let newQris='';
function showQris(u){const b=$('#p_prev');b.textContent='';if(!u)return;
 const i=document.createElement('img');i.src=u;i.alt='QRIS';i.style.cssText='max-width:100%;border-radius:12px;background:#fff';b.append(i)}
async function loadPay(){const d=await api('/api/admin/payment');if(!d.status)return;
 $('#p_dana').value=d.dana||'';$('#p_name').value=d.dana_name||'';showQris(d.qris);$('#p_del').classList.toggle('hide',!d.qris)}
$('#p_qris').onchange=async e=>{const f=e.target.files[0];if(!f)return;
 try{newQris=await img2url(f,1000,.92);showQris(newQris);say($('#p_msg'),true,'Foto dipilih. Tap Simpan pembayaran.')}catch(x){newQris='';say($('#p_msg'),false,x.message)}};
$('#payf').onsubmit=async e=>{e.preventDefault();
 const b={dana:$('#p_dana').value.trim(),dana_name:$('#p_name').value.trim()};if(newQris)b.qris=newQris;
 const d=await post('/api/admin/payment',b);say($('#p_msg'),d.status,d.status?'Pengaturan pembayaran tersimpan.':errOf(d));
 if(d.status){newQris='';$('#p_qris').value='';loadPay()}};
$('#p_del').onclick=async()=>{if(!confirm('Hapus foto QRIS?'))return;
 const d=await post('/api/admin/payment',{dana:$('#p_dana').value.trim(),dana_name:$('#p_name').value.trim(),remove_qris:true});
 say($('#p_msg'),d.status,d.status?'Foto QRIS dihapus.':errOf(d));newQris='';$('#p_qris').value='';loadPay()};

$('#logout').onclick=async()=>{try{await fetch('/api/logout',{method:'POST'})}catch{}location.href='/login'};
init();loadDeposits();loadUsers();loadPay();`,
};
