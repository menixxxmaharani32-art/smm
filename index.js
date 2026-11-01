const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

let CSS_TEXT = '';
try { CSS_TEXT = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'); }
catch (e) { console.error('style.css tidak terbaca:', e.message); }
app.get('/style.css', (req, res) => res.type('css').send(CSS_TEXT));

/* ================= Auth: cookie bertanda tangan ================= */
const secret = () => process.env.SESSION_SECRET || '';
const sign = (d) => crypto.createHmac('sha256', secret()).update(d).digest('base64url');
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const cookie = (name, v, maxAge) => `${name}=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

function tokenOf(obj) {
  const p = Buffer.from(JSON.stringify({ ...obj, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return p + '.' + sign(p);
}
function readTok(req, name) {
  const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)').exec(req.headers.cookie || '');
  if (!m || !secret()) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s || !safeEqual(sign(p), s)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}
const readAdmin = (req) => { const t = readTok(req, 'session'); return t && t.u ? t.u : null; };
const readBuyer = (req) => { const t = readTok(req, 'bs'); return t && t.id ? t.id : null; };
const adminOnly = (req, res, next) => (readAdmin(req) ? next() : res.status(401).json({ ok: false, status: false }));
const buyerOnly = (req, res, next) => {
  const id = readBuyer(req);
  if (!id) return res.status(401).json({ status: false, error: 'Silakan masuk dulu.' });
  req.buyerId = id;
  next();
};

const hashPw = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
};
const checkPw = (pw, stored) => {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const x = crypto.scryptSync(pw, salt, 32);
  const y = Buffer.from(h, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Pembatas sederhana: maksimal 10 percobaan per 10 menit per IP
const hits = new Map();
const limited = (req, k) => {
  const key = k + ((req.headers['x-forwarded-for'] || '').split(',')[0] || 'x');
  const now = Date.now();
  const a = (hits.get(key) || []).filter((t) => now - t < 600000);
  a.push(now);
  hits.set(key, a);
  return a.length > 10;
};

/* ================= Supabase (REST, kunci server) ================= */
const sb = (t) => `${process.env.SUPABASE_URL}/rest/v1/${t}`;
const dbHead = () => {
  const k = process.env.SUPABASE_SERVICE_KEY || '';
  const h = { apikey: k, 'Content-Type': 'application/json' };
  if (k.startsWith('eyJ')) h.Authorization = 'Bearer ' + k; // hanya untuk kunci legacy (JWT)
  return h;
};
async function rest(table, qs = '', opt = {}) {
  const r = await fetch(sb(table) + qs, {
    method: opt.method || 'GET',
    headers: { ...dbHead(), ...(opt.prefer ? { Prefer: opt.prefer } : {}) },
    body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
  });
  if (!r.ok) {
    const e = new Error('Supabase error ' + r.status + ' ' + (await r.text()).slice(0, 200));
    e.status = r.status;
    throw e;
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function rpc(fn, args) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: dbHead(), body: JSON.stringify(args) });
  if (!r.ok) throw new Error('Supabase error ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
const getSettings = async () => Object.fromEntries((await rest('settings', '?select=key,value')).map((x) => [x.key, x.value]));
const saveSettings = (obj) =>
  rest('settings', '', { method: 'POST', prefer: 'resolution=merge-duplicates', body: Object.entries(obj).map(([key, value]) => ({ key, value })) });

const num = (v) => Number(v) || 0;
const mask = (v) => (v ? v.slice(0, 4) + '••••' + v.slice(-4) : '');
const enc = encodeURIComponent;
const clean = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o && o[k] !== undefined && String(o[k]).trim() !== '').map((k) => [k, String(o[k]).trim()]));
const run = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); } catch (e) { console.error(e.message); res.status(500).json({ status: false, ok: false, error: e.message }); }
};

// Panggil API Sprint Pedia memakai key yang tersimpan
async function provider(pathName, params) {
  const s = await getSettings();
  if (!s.secret_key || !s.api_key) return { status: false, error: 'Key belum diisi.' };
  const r = await fetch('https://sprintpedia.id/api/' + pathName, {
    method: 'POST',
    body: new URLSearchParams({ secret_key: s.secret_key, api_key: s.api_key, ...params }),
  });
  return r.json();
}

// Semua layanan dari database (cache 30 detik)
let cache = { t: 0, rows: null };
async function allServices() {
  if (cache.rows && Date.now() - cache.t < 30000) return cache.rows;
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const part = await rest('services', '?select=id,category,name,price:data->>price,min:data->>min,max:data->>max&order=category.asc,name.asc,id.asc&limit=1000&offset=' + off);
    rows.push(...part);
    if (part.length < 1000) break;
  }
  cache = { t: Date.now(), rows };
  return rows;
}
const sellUnit = (cost, m) => Math.ceil(num(cost) * (1 + m / 100)); // harga jual per 1000

/* ================= API: admin ================= */
app.post('/api/login', (req, res) => {
  const { ADMIN_USER, ADMIN_PASS, SESSION_SECRET } = process.env;
  if (!ADMIN_USER || !ADMIN_PASS || !SESSION_SECRET)
    return res.status(500).json({ ok: false, error: 'Environment variable belum diatur di Vercel.' });
  if (limited(req, 'admin')) return res.status(429).json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' });
  const { username = '', password = '' } = req.body || {};
  const okUser = safeEqual(username, ADMIN_USER);
  const okPass = safeEqual(password, ADMIN_PASS);
  if (!(okUser && okPass)) return res.status(401).json({ ok: false, error: 'Username atau password salah.' });
  res.setHeader('Set-Cookie', cookie('session', tokenOf({ u: username }), 604800));
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => { res.setHeader('Set-Cookie', cookie('session', '', 0)); res.json({ ok: true }); });

app.get('/api/settings', adminOnly, run(async () => {
  const s = await getSettings();
  return { ok: true, secret_key: mask(s.secret_key), api_key: mask(s.api_key), markup_percent: s.markup_percent || '0' };
}));
app.post('/api/settings', adminOnly, run(async (req, res) => {
  const { secret_key, api_key, markup_percent } = req.body || {};
  const data = {};
  if (secret_key) data.secret_key = String(secret_key);
  if (api_key) data.api_key = String(api_key);
  if (markup_percent !== undefined && String(markup_percent).trim() !== '') {
    const m = Number(markup_percent);
    if (!(m >= 0 && m <= 1000)) { res.status(400); return { ok: false, error: 'Markup harus antara 0 dan 1000 persen.' }; }
    data.markup_percent = String(m);
  }
  if (!Object.keys(data).length) { res.status(400); return { ok: false, error: 'Tidak ada yang diubah.' }; }
  await saveSettings(data);
  return { ok: true };
}));

app.get('/api/profile', adminOnly, run(() => provider('profile')));

app.post('/api/services/sync', adminOnly, run(async () => {
  const d = await provider('services');
  if (!d.status || !Array.isArray(d.data)) return d;
  const now = new Date().toISOString();
  const rows = d.data.map((x) => ({ id: String(x.id), category: x.category || '', name: x.name || x.title || '', data: x, updated_at: now }));
  for (let i = 0; i < rows.length; i += 500)
    await rest('services', '', { method: 'POST', prefer: 'resolution=merge-duplicates', body: rows.slice(i, i + 500) });
  cache.rows = null;
  return { status: true, count: rows.length };
}));
app.get('/api/services', adminOnly, run(async () => {
  const s = await getSettings();
  const rows = await allServices();
  return { status: true, markup: num(s.markup_percent), data: rows.map((x) => ({ id: x.id, category: x.category, name: x.name, price: num(x.price), min: num(x.min), max: num(x.max) })) };
}));

app.post('/api/order', adminOnly, run((req) => {
  const p = clean(req.body, ['service', 'target', 'quantity', 'custom_comments', 'custom_link']);
  if (!p.service || !p.quantity) return { status: false, error: 'Layanan dan jumlah wajib diisi.' };
  return provider('order', p);
}));
app.post('/api/status', adminOnly, run((req) => {
  const p = clean(req.body, ['id']);
  if (!p.id) return { status: false, error: 'ID pesanan wajib diisi.' };
  return provider('status', p);
}));

app.get('/api/admin/users', adminOnly, run(async (req) => {
  const q = String(req.query.q || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  const rows = await rest('users', '?select=username,balance,created_at&order=created_at.desc&limit=100' + (q ? '&username=ilike.*' + q + '*' : ''));
  return { status: true, data: rows };
}));
app.post('/api/admin/topup', adminOnly, run(async (req) => {
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const amount = parseInt((req.body || {}).amount, 10);
  if (!username || !amount) return { status: false, error: 'Isi username dan jumlah saldo.' };
  const [u] = await rest('users', '?select=id&username=eq.' + enc(username));
  if (!u) return { status: false, error: 'Pembeli tidak ditemukan.' };
  const nb = await rpc('adjust_balance', { p_user: u.id, p_delta: amount });
  if (nb === null) return { status: false, error: 'Saldo tidak boleh menjadi minus.' };
  return { status: true, balance: nb };
}));

/* ================= API: publik & pembeli ================= */
app.get('/api/catalog', run(async () => {
  const m = num((await getSettings()).markup_percent);
  const rows = await allServices();
  return { status: true, data: rows.map((x) => ({ id: x.id, category: x.category, name: x.name, price: sellUnit(x.price, m), min: num(x.min), max: num(x.max) })) };
}));

app.post('/api/buyer/register', run(async (req, res) => {
  if (limited(req, 'reg')) return { status: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' };
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return { status: false, error: 'Username 3-20 karakter: huruf kecil, angka, atau garis bawah.' };
  if (password.length < 6 || password.length > 72) return { status: false, error: 'Password minimal 6 karakter.' };
  try {
    const [u] = await rest('users', '', { method: 'POST', prefer: 'return=representation', body: { username, password_hash: hashPw(password) } });
    res.setHeader('Set-Cookie', cookie('bs', tokenOf({ id: u.id }), 604800));
    return { status: true };
  } catch (e) {
    if (e.status === 409) return { status: false, error: 'Username sudah dipakai.' };
    throw e;
  }
}));
app.post('/api/buyer/login', run(async (req, res) => {
  if (limited(req, 'blogin')) return { status: false, error: 'Terlalu banyak percobaan. Coba lagi nanti.' };
  const username = String((req.body || {}).username || '').trim().toLowerCase();
  const password = String((req.body || {}).password || '');
  const [u] = username ? await rest('users', '?select=id,password_hash&username=eq.' + enc(username)) : [];
  if (!u || !checkPw(password, u.password_hash)) return { status: false, error: 'Username atau password salah.' };
  res.setHeader('Set-Cookie', cookie('bs', tokenOf({ id: u.id }), 604800));
  return { status: true };
}));
app.post('/api/buyer/logout', (req, res) => { res.setHeader('Set-Cookie', cookie('bs', '', 0)); res.json({ status: true }); });
app.get('/api/buyer/me', buyerOnly, run(async (req) => {
  const [u] = await rest('users', '?select=username,balance&id=eq.' + enc(req.buyerId));
  return u ? { status: true, username: u.username, balance: num(u.balance) } : { status: false, error: 'Akun tidak ditemukan.' };
}));
app.get('/api/buyer/orders', buyerOnly, run(async (req) => ({
  status: true,
  data: await rest('orders', '?select=id,service_name,target,quantity,price,status,created_at&order=id.desc&limit=20&user_id=eq.' + enc(req.buyerId)),
})));

// Saldo dipotong dulu (atomik); jika provider menolak, saldo dikembalikan.
app.post('/api/buyer/order', buyerOnly, run(async (req) => {
  const { service, target, quantity } = req.body || {};
  const qty = parseInt(quantity, 10);
  const tgt = String(target || '').trim();
  if (!service || !tgt || !(qty > 0)) return { status: false, error: 'Lengkapi link target dan jumlah.' };
  const [sv] = await rest('services', '?select=id,name,price:data->>price,min:data->>min,max:data->>max&id=eq.' + enc(String(service)));
  if (!sv) return { status: false, error: 'Layanan tidak ditemukan.' };
  const min = num(sv.min), max = num(sv.max);
  if (qty < min || (max && qty > max)) return { status: false, error: 'Jumlah harus antara ' + min + ' dan ' + max + '.' };
  const m = num((await getSettings()).markup_percent);
  const total = Math.ceil((qty * sellUnit(sv.price, m)) / 1000);
  if (!(total > 0)) return { status: false, error: 'Harga layanan belum valid. Hubungi admin.' };
  const uid = req.buyerId;
  const left = await rpc('adjust_balance', { p_user: uid, p_delta: -total });
  if (left === null) return { status: false, error: 'Saldo tidak cukup untuk pesanan ini.' };
  let d;
  try { d = await provider('order', { service: sv.id, target: tgt, quantity: String(qty) }); }
  catch (e) { await rpc('adjust_balance', { p_user: uid, p_delta: total }); throw e; }
  if (!d || !d.status) {
    console.error('Provider menolak pesanan:', JSON.stringify(d));
    await rpc('adjust_balance', { p_user: uid, p_delta: total });
    return { status: false, error: 'Pesanan gagal diproses. Saldo Anda dikembalikan. Coba lagi nanti atau hubungi admin.' };
  }
  const pid = d.data && (d.data.id || d.data.order_id);
  try {
    await rest('orders', '', { method: 'POST', body: { user_id: uid, service_id: sv.id, service_name: sv.name, target: tgt, quantity: qty, price: total, provider_order_id: pid ? String(pid) : null } });
  } catch (e) { console.error('Gagal mencatat pesanan:', e.message); }
  return { status: true, total, balance: left };
}));

app.post('/api/buyer/status', buyerOnly, run(async (req) => {
  const id = parseInt((req.body || {}).id, 10);
  if (!id) return { status: false, error: 'Pesanan tidak valid.' };
  const [o] = await rest('orders', '?select=id,provider_order_id&id=eq.' + id + '&user_id=eq.' + enc(req.buyerId));
  if (!o) return { status: false, error: 'Pesanan tidak ditemukan.' };
  if (!o.provider_order_id) return { status: false, error: 'Status belum bisa dicek untuk pesanan ini.' };
  const d = await provider('status', { id: o.provider_order_id });
  const st = d && d.status && d.data && typeof d.data === 'object' ? d.data.status : null;
  if (!st) return { status: false, error: 'Status belum tersedia.' };
  await rest('orders', '?id=eq.' + id, { method: 'PATCH', body: { status: String(st) } });
  return { status: true, state: String(st) };
}));

/* ================= Halaman ================= */
const page = (title, body, script) => `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"></head><body><main>${body}</main><script>${script}</script></body></html>`;

const LOGIN = page('Masuk admin', `
<h1>Masuk admin</h1><p class="muted">Kelola panel SMM dan koneksi provider.</p>
<form class="box" id="f" autocomplete="on">
<label for="u">Username</label><input id="u" name="username" autocomplete="username" required>
<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<div class="err" id="e" role="alert"></div>
<button type="submit">Masuk</button></form>`, `
document.getElementById('f').onsubmit=async ev=>{ev.preventDefault();const e=document.getElementById('e');e.textContent='';
try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('u').value.trim(),password:document.getElementById('p').value})});
const d=await r.json();if(d.ok)location.href='/admin';else e.textContent=d.error||'Gagal masuk.';}catch{e.textContent='Tidak bisa terhubung ke server.'}};`);

const ADMIN = page('Dasbor admin', `
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
<div class="err" id="msg" role="status"></div><button type="submit">Simpan pengaturan</button></form></div>`, `
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
init();loadSv();loadUsers();`);

const BUYER = page('Pilih layanan', `
<h1>Pilih layanan</h1><p class="muted">Pilih platform, kategori, lalu layanan yang Anda butuhkan.</p>

<section class="box hide" id="who"><div class="top"><div><b id="uname"></b><p class="muted" id="ubal"></p></div>
<button class="ghost" id="bout" type="button">Keluar</button></div>
<p class="muted" style="margin-top:10px">Isi saldo: hubungi admin. Deposit otomatis segera hadir.</p></section>

<section class="box" id="auth"><h2>Masuk atau daftar</h2>
<label for="a_user">Username</label><input id="a_user" autocapitalize="none" autocomplete="username">
<label for="a_pass">Password</label><input id="a_pass" type="password" autocomplete="current-password">
<div class="err" id="a_msg" role="alert"></div>
<div class="row"><button id="a_in" type="button">Masuk</button><button id="a_up" class="ghost" type="button">Daftar akun baru</button></div></section>

<section class="box"><label style="margin-top:0">Platform</label><div class="chips" id="plats"></div>
<label for="cat">Kategori</label><select id="cat" disabled></select></section>

<section class="box"><h2>Layanan</h2><p class="muted" id="cmsg" style="margin-top:6px">Memuat layanan…</p><div id="svs"></div></section>

<form class="box hide" id="bf" autocomplete="off"><h2 id="bname"></h2><p class="muted" id="binfo" style="margin-top:6px"></p>
<label for="b_link">Link target</label><input id="b_link" inputmode="url" autocapitalize="none" placeholder="https://">
<label for="b_qty">Jumlah</label><input id="b_qty" inputmode="numeric">
<p class="muted" style="margin-top:18px">Total harga</p><div class="total" id="total">Rp 0</div>
<div class="err" id="bmsg" role="status"></div><button type="submit" id="bgo">Pesan</button></form>

<section class="box hide" id="ords"><h2>Pesanan saya</h2><div id="olist"></div></section>`, `
const $=s=>document.querySelector(s);
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const post=(p,b)=>fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
let SV=[],sel=null,tot=0,me=null;

function setMe(u){me=u;$('#who').classList.toggle('hide',!u);$('#auth').classList.toggle('hide',!!u);$('#ords').classList.toggle('hide',!u);
 if(u){$('#uname').textContent=u.username;$('#ubal').textContent='Saldo '+rp(u.balance);loadOrders()}
 $('#bgo').textContent=u?'Pesan':'Masuk untuk memesan'}
async function loadMe(){try{const r=await fetch('/api/buyer/me');const d=await r.json();setMe(d.status?d:null)}catch{setMe(null)}}
async function auth(kind){const d=await post('/api/buyer/'+kind,{username:$('#a_user').value,password:$('#a_pass').value});
 if(d.status){$('#a_msg').textContent='';$('#a_pass').value='';loadMe()}else $('#a_msg').textContent=d.error||'Gagal.'}
$('#a_in').onclick=()=>auth('login');$('#a_up').onclick=()=>auth('register');
$('#bout').onclick=async()=>{await post('/api/buyer/logout');setMe(null)};

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

$('#bf').onsubmit=async e=>{e.preventDefault();
 if(!me){$('#auth').scrollIntoView({behavior:'smooth'});$('#a_msg').textContent='Masuk atau daftar dulu untuk memesan.';return}
 if(!sel)return;const q=Number($('#b_qty').value)||0;
 if(!$('#b_link').value.trim()){$('#bmsg').textContent='Isi link target.';return}
 if(!confirm('Pesan '+q+' untuk '+rp(tot)+'? Saldo Anda akan terpotong.'))return;
 $('#bmsg').textContent='Memproses…';
 const d=await post('/api/buyer/order',{service:sel.id,target:$('#b_link').value.trim(),quantity:q});
 if(d.status){$('#bmsg').textContent='Pesanan berhasil dibuat.';$('#ubal').textContent='Saldo '+rp(d.balance);loadOrders()}
 else $('#bmsg').textContent=d.error||'Gagal memesan.'};

async function loadOrders(){const r=await fetch('/api/buyer/orders');if(!r.ok)return;const d=await r.json();const box=$('#olist');box.textContent='';
 if(!d.data||!d.data.length){box.textContent='Belum ada pesanan.';return}
 d.data.forEach(o=>{const row=document.createElement('div');row.className='ord';
  const t=document.createElement('b');t.textContent=o.service_name||'Pesanan';
  const s=document.createElement('p');s.className='muted';s.textContent=o.quantity+' | '+rp(o.price)+' | '+o.status;
  const g=document.createElement('p');g.className='muted pre';g.textContent=o.target;
  const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent='Cek status';
  b.onclick=async()=>{b.textContent='Memeriksa…';const x=await post('/api/buyer/status',{id:o.id});
   if(x.status){s.textContent=o.quantity+' | '+rp(o.price)+' | '+x.state;b.textContent='Cek status'}else b.textContent=x.error||'Belum tersedia'};
  row.append(t,s,g,b);box.append(row)})}

fetch('/api/catalog').then(r=>r.json()).then(d=>{SV=d.data||[];
 if(!d.status||!SV.length){$('#cmsg').textContent='Belum ada layanan.';return}
 $('#cmsg').textContent='Pilih kategori di atas.';showPlats()}).catch(()=>{$('#cmsg').textContent='Gagal memuat layanan.'});
loadMe();`);

/* ================= Rute halaman ================= */
app.get('/', (req, res) => res.type('html').send(BUYER));
app.get('/login', (req, res) => res.type('html').send(LOGIN));
app.get('/admin', (req, res) => (readAdmin(req) ? res.type('html').send(ADMIN) : res.redirect('/login')));

module.exports = app;
