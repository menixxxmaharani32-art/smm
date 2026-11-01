// Halaman dasbor admin: judul, HTML, dan script klien
module.exports = {
  title: 'Dasbor admin',
  body: `
<div class="top"><h1>Dasbor admin</h1><button class="ghost" id="logout" type="button">Keluar</button></div>
<nav class="tabs">
<button class="tab" type="button" data-t="home" aria-selected="true">Ringkasan</button>
<button class="tab" type="button" data-t="sv" aria-selected="false">Layanan</button>
<button class="tab" type="button" data-t="us" aria-selected="false">Pembeli</button>
<button class="tab" type="button" data-t="order" aria-selected="false">Pesan</button>
<button class="tab" type="button" data-t="set" aria-selected="false">Pengaturan</button></nav>

<div data-p="home">
<section class="box"><p class="muted">Saldo Sprint Pedia</p><div class="saldo" id="saldo">…</div>
<p class="muted" id="provider"></p><button class="ghost" id="refresh" type="button" style="margin-top:14px">Segarkan saldo</button></section>
<section class="box"><h2>Layanan</h2><p class="muted" id="svcount" style="margin-top:6px">…</p></section></div>

<div data-p="sv" class="hide">
<section class="box"><h2>Daftar layanan</h2>
<p class="muted" style="margin-top:6px">Harga di sini adalah harga modal dari Sprint Pedia.</p>
<div class="row"><button id="loadsv" type="button">Impor semua layanan</button></div>
<input id="q" placeholder="Cari nama, kategori, atau ID" style="margin-top:14px" autocomplete="off">
<p class="muted" id="svmsg" style="margin:10px 0 4px"></p><div id="svlist"></div></section></div>

<div data-p="us" class="hide">
<form class="box" id="tform" autocomplete="off"><h2>Tambah saldo pembeli</h2>
<label for="t_user">Username pembeli</label><input id="t_user" autocapitalize="none" required>
<label for="t_amt">Jumlah (Rp, boleh minus untuk mengurangi)</label><input id="t_amt" inputmode="numeric" required>
<div class="err" id="tmsg" role="status"></div><button type="submit">Simpan saldo</button></form>
<section class="box"><h2>Daftar pembeli</h2>
<input id="uq" placeholder="Cari username" style="margin-top:12px" autocomplete="off">
<div id="ulist" style="margin-top:8px"></div></section></div>

<div data-p="order" class="hide">
<form class="box" id="oform" autocomplete="off"><h2>Pesan manual</h2>
<p class="muted" style="margin-top:6px">Memakai saldo Sprint Pedia Anda langsung.</p>
<p id="picked" style="margin-top:10px;font-weight:600"></p>
<label for="o_service">ID layanan</label><input id="o_service" inputmode="numeric" required>
<label for="o_target">Target (link atau username)</label><input id="o_target">
<label for="o_qty">Jumlah</label><input id="o_qty" inputmode="numeric" required>
<label for="o_comments">Komentar (jika layanan butuh)</label><textarea id="o_comments" rows="3"></textarea>
<label for="o_link">Link khusus (jika layanan butuh)</label><input id="o_link">
<div class="err" id="omsg" role="status"></div><button type="submit">Kirim pesanan</button></form>
<form class="box" id="sform" autocomplete="off"><h2>Cek status pesanan</h2>
<label for="s_id">ID pesanan Sprint Pedia</label><input id="s_id" inputmode="numeric" required>
<div class="err pre" id="smsg" role="status" style="color:var(--ink)"></div><button type="submit">Cek status</button></form></div>

<div data-p="set" class="hide">
<form class="box" id="form" autocomplete="off"><h2>Key Sprint Pedia</h2>
<p class="muted" style="margin-top:6px">Kosongkan kolom yang tidak ingin diubah.</p>
<label for="secret_key">Secret key</label><input id="secret_key" type="password" autocomplete="off">
<label for="api_key">API key</label><input id="api_key" type="password" autocomplete="off">
<label for="markup">Markup harga untuk pembeli (%)</label><input id="markup" inputmode="decimal">
<div class="err" id="msg" role="status"></div><button type="submit">Simpan pengaturan</button></form></div>`,
  script: `
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
async function api(p,o){const r=await fetch(p,o);if(r.status===401){location.href='/login';throw new Error('401')}return r.json()}
const post=(p,b)=>api(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})});
const errOf=d=>typeof d.data==='string'?d.data:(d.error||'Terjadi kesalahan.');
function tab(t){document.querySelectorAll('[data-p]').forEach(e=>e.classList.toggle('hide',e.dataset.p!==t));
 document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)))}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>tab(b.dataset.t));
function item(t,sub,fn){const b=document.createElement('button');b.type='button';b.className='item';
 const a=document.createElement('b');a.textContent=t;const c=document.createElement('span');c.className='muted';c.textContent=sub;b.append(a,c);b.onclick=fn;return b}

let SV=[];
function pick(x){$('#o_service').value=x.id;$('#picked').textContent='Dipilih: '+x.name+' (ID '+x.id+')';tab('order')}
function renderSv(){const q=$('#q').value.toLowerCase().trim();const box=$('#svlist');box.textContent='';
 const list=q?SV.filter(x=>(x.name+' '+x.category+' '+x.id).toLowerCase().includes(q)):SV;
 const g={};list.forEach(x=>{const c=x.category||'Tanpa kategori';(g[c]=g[c]||[]).push(x)});
 const cats=Object.keys(g);
 $('#svmsg').textContent=SV.length?(list.length+' layanan dalam '+cats.length+' kategori'):'Belum ada layanan. Tap Impor semua layanan.';
 cats.slice(0,80).forEach(c=>{const d=document.createElement('details');const s=document.createElement('summary');
  const a=document.createElement('span');a.textContent=c;const n=document.createElement('span');n.className='muted';n.textContent=g[c].length;s.append(a,n);d.append(s);
  let done=false;const fill=()=>{if(done)return;done=true;g[c].slice(0,200).forEach(x=>d.append(item(x.name,'ID '+x.id+' | '+rp(x.price)+' per 1000 | min '+x.min+' | maks '+x.max,()=>pick(x))))};
  d.ontoggle=()=>{if(d.open)fill()};if(q&&cats.length<=6){d.open=true;fill()}box.append(d)});
 if(cats.length>80)box.append(Object.assign(document.createElement('p'),{className:'muted',textContent:'Hanya 80 kategori pertama. Persempit pencarian.'}))}
async function loadSv(){const d=await api('/api/services');SV=d.data||[];
 $('#svcount').textContent=SV.length+' layanan terimpor. Markup pembeli '+(d.markup||0)+'%.';renderSv()}
async function syncSv(){$('#svmsg').textContent='Mengimpor semua layanan, tunggu sebentar…';
 const d=await post('/api/services/sync');
 if(d.status){$('#svmsg').textContent=d.count+' layanan berhasil diimpor.';loadSv()}else $('#svmsg').textContent=errOf(d)}
$('#loadsv').onclick=syncSv;$('#q').oninput=renderSv;

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
 $('#msg').textContent=d.ok?'Pengaturan tersimpan.':errOf(d);
 if(d.ok){$('#secret_key').value='';$('#api_key').value='';init();loadSv()}};

$('#oform').onsubmit=async e=>{e.preventDefault();
 const b={service:$('#o_service').value.trim(),target:$('#o_target').value.trim(),quantity:$('#o_qty').value.trim(),custom_comments:$('#o_comments').value.trim(),custom_link:$('#o_link').value.trim()};
 if(!confirm('Kirim pesanan layanan '+b.service+' sejumlah '+b.quantity+'? Saldo Sprint Pedia akan terpotong.'))return;
 $('#omsg').textContent='Mengirim…';const d=await post('/api/order',b);
 if(d.status){const id=d.data&&(d.data.id||d.data.order_id);$('#omsg').textContent='Pesanan terkirim.'+(id?' ID pesanan: '+id:' '+JSON.stringify(d.data));balance()}
 else $('#omsg').textContent=errOf(d)};
$('#sform').onsubmit=async e=>{e.preventDefault();$('#smsg').textContent='Memeriksa…';
 const d=await post('/api/status',{id:$('#s_id').value.trim()});
 if(d.status&&d.data&&typeof d.data==='object')$('#smsg').textContent=Object.entries(d.data).map(kv=>kv[0]+': '+kv[1]).join(String.fromCharCode(10));
 else $('#smsg').textContent=errOf(d)};

async function loadUsers(){const d=await api('/api/admin/users?q='+encodeURIComponent($('#uq').value.trim()));const box=$('#ulist');box.textContent='';
 if(!d.status){box.textContent=errOf(d);return}
 if(!d.data.length){box.textContent='Belum ada pembeli.';return}
 d.data.forEach(u=>box.append(item(u.username,'Saldo '+rp(u.balance),()=>{$('#t_user').value=u.username;$('#t_amt').focus()})))}
let tm;$('#uq').oninput=()=>{clearTimeout(tm);tm=setTimeout(loadUsers,300)};
$('#tform').onsubmit=async e=>{e.preventDefault();
 const d=await post('/api/admin/topup',{username:$('#t_user').value.trim(),amount:$('#t_amt').value.trim()});
 $('#tmsg').textContent=d.status?('Berhasil. Saldo sekarang '+rp(d.balance)):errOf(d);
 if(d.status){$('#t_amt').value='';loadUsers()}};
$('#logout').onclick=async()=>{try{await fetch('/api/logout',{method:'POST'})}catch{}location.href='/login'};
init();loadSv();loadUsers();`,
};
