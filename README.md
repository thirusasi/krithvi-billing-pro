# Krithvi Billing – full web + mobile version

Invoices, quotations, GST reports, staff logins (owner / staff), works in any phone or computer browser and can be added to the phone home screen like an app.

## Run on your own computer to test
1. Install Node.js 18 or newer (nodejs.org).
2. In this folder run: `npm install` then `npm start`
3. Open http://localhost:3000 – the first screen creates the OWNER login.

## Put it online (give this section to your web developer)
**Option A – Render.com / Railway (easiest):** create a Node web service from this folder, start command `npm start`, add a persistent disk and set `DB_FILE=/data/krithvi.db` (disk mounted at /data), set `NODE_ENV=production`, then connect your domain.
**Option B – small Ubuntu server (about Rs 400-600/month):** install Node 18+, copy this folder, `npm install`, run with `pm2 start server.js`, and put Caddy or Nginx in front for free HTTPS and your domain name. Set `NODE_ENV=production`.

HTTPS is required (login cookies are marked Secure in production).

## Backups (important)
All data is in one file, `krithvi.db`. Copy it every day (cron job or the host's backup feature). Also use Settings > Download backup now and then.

## Roles
- Owner: everything, including settings, reports, deleting bills, adding logins.
- Staff: create and edit bills and quotations only. Bill numbers are issued by the server, so two branches never get the same number.

## Move your bills from the claude.ai version
Open the old page, Settings > Download backup. In this version, sign in as owner, Settings > Restore backup file.
