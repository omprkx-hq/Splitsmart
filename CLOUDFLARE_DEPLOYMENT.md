# 🌐 Deploying SplitSmart to Cloudflare

SplitSmart is configured for global deployment so anyone in the world can access it on mobile or desktop.

---

## ⚡ Option 1: Instant Global Public URL via Cloudflare Tunnel (Recommended)
This exposes your entire full-stack application (frontend + Node.js backend + APIs + WebSocket/database connections) globally with a secure HTTPS URL:

```bash
npm run tunnel
```

Once executed, Cloudflare will output your public HTTPS link:
```
🎉 SPLITSMART IS LIVE GLOBALLY ON CLOUDFLARE:
🌐 Public HTTPS URL: https://[random-subdomain].trycloudflare.com
```
Anyone worldwide can open this link on their smartphone, tablet, or PC to sign in with Google, split expenses, and settle balances!

---

## 🚀 Option 2: Cloudflare Pages Deployment (Static Frontend)

SplitSmart's frontend (`public/`) is pre-configured with `wrangler.toml`, `public/_redirects`, and `public/_headers`.

### Step 1: Deploy with Wrangler
Run the deployment command:
```bash
npm run deploy:pages
```
Or via npx:
```bash
npx wrangler pages deploy public --project-name splitsmart
```

### Step 2: Set API URL
If hosting the backend on Render, Railway, or VPS, set the `API_BASE` in `public/js/api.js` or through environment variables.

---

## 🗄️ Connecting Persistent Supabase Database & Google OAuth

### 1. Supabase PostgreSQL
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings &rarr; Database** &rarr; copy the **Connection string (URI)**.
3. In your `.env` file, set:
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
4. When the server boots up or when you click **⚡ Cloud Database / Supabase Config** in the SplitSmart login screen, SplitSmart will connect and automatically run the schema migration (`schema.sql`) to create all 11 tables!

### 2. Google OAuth
1. In your Supabase Dashboard, go to **Authentication &rarr; Providers &rarr; Google**.
2. Enable Google provider and paste your Google Cloud Client ID and Secret (from Google Cloud Console).
3. Set your Redirect URL to:
   ```
   https://[YOUR_SUPABASE_REF].supabase.co/auth/v1/callback
   ```
4. SplitSmart handles the OAuth redirect and automatically syncs user profile names, verified emails, and avatar photos!

