# Staging/backup deployment: WordPress backend on Namecheap

This is a **second, independent deployment** of the same app — same Next.js codebase, same GitHub
repo — but pointed at a WordPress site (via the `tap-ops` plugin) instead of Postgres. It has its own
users and its own data; it is not synced with the live production site in any way. Useful as a fallback
platform or somewhere to test changes without touching production data.

I tested this exact setup locally (WordPress + plugin + the app talking to it) before writing this —
login, every page, and the request-quote → approve flow all work.

## 1. Install WordPress on Namecheap
1. Namecheap hosting cPanel → **Softaculous Apps Installer** (or **WordPress Manager by Softaculous**) → install WordPress.
2. Pick the domain/subdomain you want this on (e.g. `staging.tapsvs.com` — create the subdomain first in cPanel → **Subdomains** if it doesn't exist).
3. During install, set your own admin username/password — **this becomes your login for the console too** (see step 5), no separate account needed.
4. Once installed, confirm `https://staging.tapsvs.com/wp-admin` loads and you can log in.

## 2. Install the tap-ops plugin
1. In this project's folder, zip `wordpress/tap-ops` (the folder itself must be the zip's root, so it unzips to `tap-ops/tap-ops.php`).
2. WordPress admin → **Plugins → Add New → Upload Plugin** → upload the zip → **Activate**.
3. Activation creates its database tables and two roles (`TAP Admin`, `TAP Inspector`) — your normal WordPress Administrator account already counts as admin for the console, no role change needed.

## 3. Configure the plugin
Namecheap cPanel → **File Manager** (or FTP) → edit `wp-config.php` in your WordPress root, add above the line `/* That's all, stop editing! */`:
```php
define( 'TAP_API_KEY', 'generate-a-long-random-string-here' );
```
Generate that string any way you like (e.g. `openssl rand -base64 48` in a terminal, or any password generator) — just make sure it's long, random, and you keep a copy for step 5. Don't define `TAP_QUOTE_FORM_ID` or `TAP_ALLOW_DEV_SEED` — this staging site doesn't need the Gravity Forms hook (the app's own `/request-quote` page handles that) and should never have the dev-seed backdoor enabled.

## 4. Check the API is live
Visit `https://staging.tapsvs.com/wp-json/tap/v1/customers` in a browser — you should see `{"code":"bad_key",...}`. That confirms the plugin is running and locked. (If you get a 404, check **Settings → Permalinks** in WordPress is set to anything other than "Plain".)

## 5. Create the second Vercel project
1. [vercel.com](https://vercel.com) → **Add New → Project** → import the **same** GitHub repo you already deployed for production.
2. Give it a distinct name (e.g. `tap-ops-staging`) so it's not confused with the live one.
3. **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `DATA_BACKEND` | `wordpress` |
| `WP_API_URL` | `https://staging.tapsvs.com/wp-json/tap/v1` |
| `WP_API_KEY` | the exact same value as `TAP_API_KEY` from step 3 |
| `AUTH_SECRET` | a random string — generate with `npx auth secret` (use a **different** value than production) |
| `NEXTAUTH_URL` | this project's URL once you know it, e.g. `https://tap-ops-staging.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |

Do **not** set `DATABASE_URL` here — this deployment never touches Postgres.

4. Deploy. Once it's live at its `*.vercel.app` URL, sign in with your WordPress admin's username/email and password from step 1.

## 6. Optional: attach a domain
Same pattern as production (Vercel → **Settings → Domains** → add a subdomain → create the CNAME record it shows you wherever your DNS is managed). Not required — the `*.vercel.app` URL works fine for a staging/backup environment.

## Notes
- **Two separate logins.** Users you create on the production site (Postgres) do not exist here, and vice versa — they're entirely different user stores.
- **Photo uploads** work the same way here as in production (Vercel Blob if `BLOB_READ_WRITE_TOKEN` is set, otherwise a local folder that doesn't persist on Vercel).
- **Moving to Lightsail later:** nothing here is Namecheap-specific — WordPress + the plugin work the same anywhere. Point `WP_API_URL` at the new address and update `TAP_API_KEY`/`WP_API_KEY` to match if you ever regenerate it.
- If this WordPress site is ever slow to wake up (cheap shared hosting can be), that's fine by design — the app's session check tolerates a slow or failed backend without logging you out (same fix as the production lag issue), it just waits up to 8 seconds per request before giving up.
