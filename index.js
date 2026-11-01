const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

/* ---------- Auth (cookie bertanda tangan) ---------- */
const secret = () => process.env.SESSION_SECRET || '';
const sign = (d) => crypto.createHmac('sha256', secret()).update(d).digest('base64url');
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const cookie = (v, maxAge) => `session=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

function createToken(user) {
  const p = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return p + '.' + sign(p);
}
function readUser(req) {
  const m = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie || '');
  if (!m || !secret()) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s || !safeEqual(sign(p), s)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() ? d.u : null;
  } catch { return null; }
}
const needLogin = (req, res, next) => (readUser(req) ? next() : res.status(401).json({ ok: false }));

/* ---------- Supabase (REST, pakai service role key) ---------- */
const dbUrl = () => `${process.env.SUPABASE_URL}/rest/v1/settings`;
const dbHead = () => ({
  apikey: process.env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
});
async function getSettings() {
  const r = await fetch(dbUrl() + '?select=key,value', { headers: dbHead() });
  if (!r.ok) throw new Error('Supabase error ' + r.status);
  return Object.fromEntries((await r.json()).map((x) => [x.key, x.value]));
}
async function saveSettings(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({ key, value }));
  const r = await fetch(dbUrl(), {
    method: 'POST',
    headers: { ...dbHead(), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error('Supabase error ' + r.status);
}
const mask = (v) => (v ? v.slice(0, 4) + '••••' + v.slice(-4) : '');

/* ---------- API ---------- */
app.post('/api/login', (req, res) => {
  const { ADMIN_USER, ADMIN_PASS, SESSION_SECRET } = process.env;
  if (!ADMIN_USER || !ADMIN_PASS || !SESSION_SECRET)
    return res.status(500).json({ ok: false, error: 'Environment variable belum diatur di Vercel.' });
  const { username = '', password = '' } = req.body || {};
  const okUser = safeEqual(username, ADMIN_USER);
  const okPass = safeEqual(password, ADMIN_PASS);
  if (!(okUser && okPass)) return res.status(401).json({ ok: false, error: 'Username atau password salah.' });
  res.setHeader('Set-Cookie', cookie(createToken(username), 604800));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', cookie('', 0));
  res.json({ ok: true });
});

app.get('/api/settings', needLogin, async (req, res) => {
  try {
    const s = await getSettings();
    res.json({ ok: true, secret_key: mask(s.secret_key), api_key: mask(s.api_key) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/settings', needLogin, async (req, res) => {
  try {
    const { secret_key, api_key } = req.body || {};
    const data = {};
    if (secret_key) data.secret_key = secret_key;
    if (api_key) data.api_key = api_key;
    if (!Object.keys(data).length) return res.status(400).json({ ok: false, error: 'Isi minimal satu key.' });
    await saveSettings(data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Menu Profil Sprint Pedia: saldo & info akun
app.get('/api/profile', needLogin, async (req, res) => {
  try {
    const s = await getSettings();
    if (!s.secret_key || !s.api_key) return res.json({ status: false, error: 'Key belum diisi.' });
    const r = await fetch('https://sprintpedia.id/api/profile', {
      method: 'POST',
      body: new URLSearchParams({ secret_key: s.secret_key, api_key: s.api_key }),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

/* ---------- Layanan, pesanan, status (Sprint Pedia) ---------- */
async function provider(path, params) {
  const s = await getSettings();
  if (!s.secret_key || !s.api_key) return { status: false, error: 'Key belum diisi.' };
  const r = await fetch('https://sprintpedia.id/api/' + path, {
    method: 'POST',
    body: new URLSearchParams({ secret_key: s.secret_key, api_key: s.api_key, ...params }),
  });
  return r.json();
}
const clean = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o && o[k] !== undefined && String(o[k]).trim() !== '').map((k) => [k, String(o[k]).trim()]));
const run = (fn) => async (req, res) => {
  try { res.json(await fn(req)); } catch (e) { res.status(500).json({ status: false, error: e.message }); }
};

app.get('/api/services', needLogin, run(() => provider('services')));

app.post('/api/order', needLogin, run((req) => {
  const p = clean(req.body, ['service', 'target', 'quantity', 'custom_comments', 'custom_link']);
  if (!p.service || !p.quantity) return { status: false, error: 'Layanan dan jumlah wajib diisi.' };
  return provider('order', p);
}));

app.post('/api/status', needLogin, run((req) => {
  const p = clean(req.body, ['id']);
  if (!p.id) return { status: false, error: 'ID pesanan wajib diisi.' };
  return provider('status', p);
}));

/* ---------- Halaman ---------- */
const CSS = `:root{--bg:#e9eff1;--surface:#fff;--ink:#10222b;--muted:#5b6f78;--line:#cbd8dd;--accent:#0f766e;--accent-ink:#fff;--danger:#b42318}
@media(prefers-color-scheme:dark){:root{--bg:#0c171c;--surface:#13242b;--ink:#e6f0f2;--muted:#8fa6af;--line:#244049;--accent:#2dd4bf;--accent-ink:#06211e;--danger:#ff8a7a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Plus Jakarta Sans",system-ui,sans-serif;min-height:100vh}
main{max-width:520px;margin:0 auto;padding:28px 20px 48px}
h1{font-size:1.6rem;margin:0 0 4px;letter-spacing:-.02em}
p{margin:0}.muted{color:var(--muted)}
.box{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px;margin-top:18px}
label{display:block;font-weight:600;font-size:.9rem;margin:14px 0 6px}
input,textarea{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
input:focus-visible,textarea:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button{margin-top:18px;padding:12px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;cursor:pointer}
button.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);margin-top:0}
.err{color:var(--danger);min-height:1.5em;margin-top:12px;font-size:.92rem}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.saldo{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-top:6px}
.item{display:block;width:100%;text-align:left;background:transparent;color:var(--ink);border:0;border-top:1px solid var(--line);border-radius:0;margin:0;padding:12px 2px;font-weight:400}
.item b{display:block;font-weight:600}
.pre{white-space:pre-wrap;word-break:break-word;margin-top:12px}
h2{margin:0;font-size:1.1rem}`;

const page = (title, body, script) => `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><main>${body}</main><script>${script}</script></body></html>`;

const LOGIN = page('Masuk admin', `
<h1>Masuk admin</h1><p class="muted">Kelola panel SMM dan koneksi provider.</p>
<form class="box" id="f" autocomplete="on">
<label for="u">Username</label><input id="u" name="username" autocomplete="username" required>
<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<div class="err" id="e" role="alert"></div>
<button type="submit">Masuk</button></form>`, `
document.getElementById('f').onsubmit=async ev=>{ev.preventDefault();const e=document.getElementById('e');e.textContent='';
try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u.value.trim(),password:p.value})});
const d=await r.json();if(d.ok)location.href='/admin';else e.textContent=d.error||'Gagal masuk.';}catch{e.textContent='Tidak bisa terhubung ke server.'}};`);

const ADMIN = page('Dasbor admin', `
<div class="top"><h1>Dasbor admin</h1><button class="ghost" id="logout" type="button">Keluar</button></div>
<section class="box"><p class="muted">Saldo Sprint Pedia</p><div class="saldo" id="saldo">…</div>
<p class="muted" id="provider"></p><button class="ghost" id="refresh" type="button" style="margin-top:14px">Segarkan saldo</button></section>
<section class="box"><h2>Daftar layanan</h2>
<p class="muted">Cari layanan, lalu tap salah satu untuk mengisi ID-nya di form pesanan.</p>
<button class="ghost" id="loadsv" type="button" style="margin-top:12px">Muat layanan</button>
<input id="q" placeholder="Cari nama, kategori, atau ID" style="margin-top:12px" autocomplete="off">
<p class="muted" id="svmsg" style="margin-top:8px"></p><div id="svlist" style="margin-top:8px"></div></section>
<form class="box" id="oform" autocomplete="off"><h2>Pesan baru</h2>
<p class="muted">Pesanan langsung memotong saldo Sprint Pedia.</p>
<label for="o_service">ID layanan</label><input id="o_service" inputmode="numeric" required>
<label for="o_target">Target (link atau username)</label><input id="o_target">
<label for="o_qty">Jumlah</label><input id="o_qty" inputmode="numeric" required>
<label for="o_comments">Komentar (jika layanan butuh)</label><textarea id="o_comments" rows="3"></textarea>
<label for="o_link">Link khusus (jika layanan butuh)</label><input id="o_link">
<div class="err" id="omsg" role="status"></div><button type="submit">Kirim pesanan</button></form>
<form class="box" id="sform" autocomplete="off"><h2>Cek status pesanan</h2>
<label for="s_id">ID pesanan</label><input id="s_id" inputmode="numeric" required>
<div class="err pre" id="smsg" role="status" style="color:var(--ink)"></div><button type="submit">Cek status</button></form>
<form class="box" id="form" autocomplete="off"><h2 style="margin:0;font-size:1.1rem">Key Sprint Pedia</h2>
<p class="muted">Kosongkan kolom yang tidak ingin diubah.</p>
<label for="secret_key">Secret key</label><input id="secret_key" type="password" autocomplete="off">
<label for="api_key">API key</label><input id="api_key" type="password" autocomplete="off">
<div class="err" id="msg" role="status"></div><button type="submit">Simpan key</button></form>`, `
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
async function api(p,o){const r=await fetch(p,o);if(r.status===401){location.href='/';throw new Error('401')}return r.json()}
async function balance(){$('#provider').textContent='Mengambil saldo…';
 try{const d=await api('/api/profile');
  if(d.status){$('#saldo').textContent=rp(d.data.balance);$('#provider').textContent='Terhubung sebagai '+d.data.username}
  else{$('#saldo').textContent='—';$('#provider').textContent=typeof d.data==='string'?d.data:(d.error||'Gagal terhubung.')}
 }catch{}}
async function init(){const d=await api('/api/settings');
 $('#secret_key').placeholder=d.secret_key||'Belum diisi';$('#api_key').placeholder=d.api_key||'Belum diisi';
 if(d.secret_key&&d.api_key)balance();else{$('#saldo').textContent='—';$('#provider').textContent='Isi key untuk menghubungkan Sprint Pedia.'}}
$('#form').onsubmit=async e=>{e.preventDefault();
 const d=await api('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret_key:$('#secret_key').value.trim(),api_key:$('#api_key').value.trim()})});
 $('#msg').textContent=d.ok?'Key tersimpan.':(d.error||'Gagal menyimpan.');
 if(d.ok){$('#secret_key').value='';$('#api_key').value='';init()}};
$('#refresh').onclick=balance;
$('#logout').onclick=async()=>{await fetch('/api/logout',{method:'POST'});location.href='/'};
let SV=[];
function item(t,sub,fn){const b=document.createElement('button');b.type='button';b.className='item';const a=document.createElement('b');a.textContent=t;const c=document.createElement('span');c.className='muted';c.textContent=sub;b.append(a,c);b.onclick=fn;return b}
function showSv(){const q=$('#q').value.toLowerCase().trim();const box=$('#svlist');box.textContent='';
 const list=SV.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q)).slice(0,40);
 if(!list.length){box.textContent=SV.length?'Tidak ada yang cocok.':'';return}
 list.forEach(x=>{const name=x.name||x.title||x.category||'Layanan';
  const sub='ID '+x.id+(x.category&&x.name?' | '+x.category:'')+(x.price!=null?' | '+rp(x.price):'')+(x.min?' | min '+x.min:'')+(x.max?' | max '+x.max:'');
  box.append(item(name,sub,()=>{$('#o_service').value=x.id;$('#o_service').scrollIntoView({behavior:'smooth',block:'center'})}))})}
async function loadSv(){$('#svmsg').textContent='Memuat layanan…';const d=await api('/api/services');
 if(d.status&&Array.isArray(d.data)){SV=d.data;$('#svmsg').textContent=SV.length+' layanan dimuat.';showSv()}
 else $('#svmsg').textContent=typeof d.data==='string'?d.data:(d.error||'Gagal memuat layanan.')}
$('#loadsv').onclick=loadSv;$('#q').oninput=showSv;
$('#oform').onsubmit=async e=>{e.preventDefault();
 const b={service:$('#o_service').value.trim(),target:$('#o_target').value.trim(),quantity:$('#o_qty').value.trim(),custom_comments:$('#o_comments').value.trim(),custom_link:$('#o_link').value.trim()};
 if(!confirm('Kirim pesanan layanan '+b.service+' sejumlah '+b.quantity+'? Saldo Sprint Pedia akan terpotong.'))return;
 $('#omsg').textContent='Mengirim…';
 const d=await api('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 if(d.status){const id=d.data&&(d.data.id||d.data.order_id);$('#omsg').textContent='Pesanan terkirim.'+(id?' ID pesanan: '+id:' '+JSON.stringify(d.data));balance()}
 else $('#omsg').textContent=typeof d.data==='string'?d.data:(d.error||JSON.stringify(d))};
$('#sform').onsubmit=async e=>{e.preventDefault();$('#smsg').textContent='Memeriksa…';
 const d=await api('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:$('#s_id').value.trim()})});
 if(d.status&&d.data&&typeof d.data==='object')$('#smsg').textContent=Object.entries(d.data).map(kv=>kv[0]+': '+kv[1]).join('\n');
 else $('#smsg').textContent=typeof d.data==='string'?d.data:(d.error||JSON.stringify(d))};
init();`);

app.get('/', (req, res) => res.type('html').send(LOGIN));
app.get('/admin', (req, res) => (readUser(req) ? res.type('html').send(ADMIN) : res.redirect('/')));

module.exports = app;
