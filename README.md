# SMM Panel (Vercel + Supabase) - tanpa folder

File: index.js, package.json, supabase.sql (semua di root, tidak ada folder).

1. Supabase > SQL Editor: jalankan isi supabase.sql.
2. Vercel > Settings > Environment Variables:
   - ADMIN_USER = alzJB
   - ADMIN_PASS = alzzstore
   - SESSION_SECRET = teks acak panjang (minimal 32 karakter)
   - SUPABASE_URL = Project URL Supabase
   - SUPABASE_SERVICE_KEY = service_role key Supabase
3. Upload file ke GitHub, import ke Vercel (Framework: Express / Other).
4. Buka situs, masuk, isi secret key dan API key Sprint Pedia di dasbor.
