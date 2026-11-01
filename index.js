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
input{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
input:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button{margin-top:18px;padding:12px 18px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;cursor:pointer}
button.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);margin-top:0}
.err{color:var(--danger);min-height:1.5em;margin-top:12px;font-size:.92rem}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.saldo{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-top:6px}`;

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
init();`);

app.get('/', (req, res) => res.type('html').send(LOGIN));
app.get('/admin', (req, res) => (readUser(req) ? res.type('html').send(ADMIN) : res.redirect('/')));

module.exports = app;
