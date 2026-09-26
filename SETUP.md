# TAP Ops Console: setup guide (headless WordPress + Next.js)

## How it fits together

```
Browser ──> Next.js app (Vercel)  ──server-to-server, secret key──>  WordPress + tap-ops plugin (your host)
            UI, business logic                                        database, users/roles, REST API
                                                                      Gravity Form intake -> New Customers
```

- **WordPress** stores all data (custom `tap_*` tables in your WP database) and owns the user accounts.
- **Next.js** is the console people use. It never touches the database; it calls the plugin's REST API from the server
  with a shared secret (`TAP_API_KEY`). The key never reaches the browser.
- Staff sign in on the Next.js login page with their **WordPress** email and password.
- The existing **Gravity Form** on tapsvs.com creates a pending request; an admin approves it under **New Customers**.

You need: a WordPress site (6.0+, PHP 7.4+, HTTPS) with admin access, a Vercel account (or any Node 20+ host),
and Gravity Forms (already on tapsvs.com).

---

## Part 1: WordPress

### 1. Install the plugin
1. Zip the folder `wordpress/tap-ops` (the folder itself must be the zip root: `tap-ops/tap-ops.php`).
2. WordPress admin, **Plugins > Add New > Upload Plugin**, upload the zip, **Activate**.
   Activation creates the tables and two roles: **TAP Admin** and **TAP Inspector**.

### 2. Add the secret key
Generate a long random key (for example `openssl rand -base64 48`) and add to `wp-config.php`,
above the line `/* That's all, stop editing! */`:

```php
define( 'TAP_API_KEY', 'PASTE-YOUR-LONG-RANDOM-KEY-HERE' );
define( 'TAP_QUOTE_FORM_ID', 3 );   // the numeric ID of your Request a Quote Gravity Form (Forms > hover the form)
```
Do **not** define `TAP_ALLOW_DEV_SEED` in production (it is for demo data only).
Without `TAP_API_KEY` every endpoint returns 503 by design.

### 3. Create the people
**Users > Add New**, then set the role:
- **TAP Admin** for you: full access, approvals, team management, approving new customers.
- **TAP Inspector** for auditors: run audits, manage actions, view customers.
Existing WordPress Administrators also count as admins. Users need no other WordPress permissions; they only use the console.

### 4. Check the API works
Open `https://YOUR-SITE/wp-json/tap/v1/customers` in a browser. You should see
`{"code":"bad_key", ...}` (401). That means the plugin is live and locked. (503 means the key constant is missing.)

### 5. Things that can block the API
- Plugins that disable or restrict the REST API (security/"Disable REST API" plugins): allow `/wp-json/tap/v1/*`.
- Caching plugins/CDN: exclude `/wp-json/tap/*` from caching.
- Web application firewalls (Wordfence, Cloudflare): the API is called from Vercel servers; whitelist if blocked.
- The site must be served over HTTPS; the key is sent in a header.

### 6. Gravity Forms: new customers
Nothing to configure if your form's title contains "Quote" or you set `TAP_QUOTE_FORM_ID`.
On every submission the plugin creates a **pending request**. Fields are matched by **label** (First Name, Last Name,
Company Name, Title, Street Address, Address Line 2, City, State, ZIP, Phone, Email, Date Needed, Additional Info; a
Name field and an Address field are also understood; checkbox choices become Services, or Training when the field label
contains "training"). **Keep those labels** if you edit the form. **Test once with a real submission** (see Part 4).

---

## Part 2: Next.js app

### Environment variables
Copy `.env.example` to `.env` (local) or add these in Vercel **Project > Settings > Environment Variables**:

| Variable | Value |
|---|---|
| `WP_API_URL` | `https://YOUR-SITE/wp-json/tap/v1` (no trailing slash) |
| `WP_API_KEY` | exactly the same value as `TAP_API_KEY` |
| `AUTH_SECRET` | random string (`npx auth secret`) |
| `NEXTAUTH_URL` | the console's public URL, e.g. `https://portal.tapsvs.com` |
| `AUTH_TRUST_HOST` | `true` (only if not on Vercel) |
| `BLOB_READ_WRITE_TOKEN` | optional: enables photo uploads on Vercel (Storage > Blob) |

### Run locally
```bash
npm install
npm run build && npm start        # http://localhost:3000   (use `npm run dev` on a machine with enough memory)
```

### Deploy to Vercel
1. Push the `ops-console` folder to a Git repository (GitHub).
2. Vercel, **Add New > Project**, import the repo, framework: Next.js. Set the environment variables above. Deploy.
3. Optional custom domain, for example `portal.tapsvs.com` (add the CNAME Vercel shows you). Update `NEXTAUTH_URL`.
4. In WordPress, add a menu item or button "Client / Ops Portal" that links to the console URL.

---

## Part 3: First run
1. Open the console URL, sign in with the **TAP Admin** WordPress account.
2. **Templates > New Template** to build your inspection templates.
3. **Customers**: add customers, or wait for Gravity Form requests under **New Customers**.
4. **New Audit** to start inspecting. Failed items automatically raise corrective actions.

## Part 4: Acceptance checklist
- [ ] `/wp-json/tap/v1/customers` returns `bad_key` (401), not 404/503.
- [ ] Admin can sign in; a deactivated user cannot (Team page > Deactivate).
- [ ] Submit the real quote form; a request appears under **New Customers**; **Approve** creates the customer with its address, contact, email and phone.
- [ ] Create an audit with a failed item; an action appears under **Actions**; **Create public link** works in a private window.
- [ ] Photo upload works (needs `BLOB_READ_WRITE_TOKEN` on Vercel).

## Try everything locally without a real WordPress
```bash
cd wordpress/tap-ops
npx @wp-playground/cli server --port=9400 --auto-mount --blueprint=playground-blueprint.json
# in another terminal:
curl -X POST -H "X-TAP-Key: test-key-123" http://127.0.0.1:9400/wp-json/tap/v1/dev/seed
```
Set `WP_API_URL=http://127.0.0.1:9400/wp-json/tap/v1` and `WP_API_KEY=test-key-123`, then sign in as
`admin@tapsvs.com` / `changeme123`. (Playground data is temporary.)

## Troubleshooting
| Symptom | Cause |
|---|---|
| "Could not reach the WordPress backend" | wrong `WP_API_URL`, site down, or firewall blocking the host |
| Everything returns 401 `bad_key` | `WP_API_KEY` differs from `TAP_API_KEY` (check for stray spaces/quotes) |
| 503 `not_configured` | `TAP_API_KEY` missing from wp-config.php |
| Login always fails | user has neither TAP role nor Administrator, or is deactivated |
| Quote requests never show up | form title lacks "Quote" and `TAP_QUOTE_FORM_ID` isn't set; or labels were renamed |
| REST returns HTML / 404 | permalinks set to "Plain": use Settings > Permalinks > Post name |

## Known limits
- Verified on WordPress Playground (SQLite). **Not yet verified on real MySQL/MariaDB or with real Gravity Forms**; run the checklist above once on staging first.
- Photos are stored in Vercel Blob (or `public/uploads` locally), not the WordPress media library.
- WordPress admin (`/wp-admin`) still exists for your own account; staff never need it.
