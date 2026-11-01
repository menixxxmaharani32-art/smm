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
  data: await rest('orders', '?select=id,target,price&order=id.desc&limit=20&user_id=eq.' + enc(req.buyerId)),
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

const ADMIN_PAGE = require('./page-admin');
const BUYER_PAGE = require('./page-buyer');
const ADMIN = page(ADMIN_PAGE.title, ADMIN_PAGE.body, ADMIN_PAGE.script);
const BUYER = page(BUYER_PAGE.title, BUYER_PAGE.body, BUYER_PAGE.script);

/* ================= Rute halaman ================= */
app.get('/', (req, res) => res.type('html').send(BUYER));
app.get('/login', (req, res) => res.type('html').send(LOGIN));
app.get('/admin', (req, res) => (readAdmin(req) ? res.type('html').send(ADMIN) : res.redirect('/login')));

module.exports = app;
