# TAP Ops (WordPress plugin)

Headless back end for the TAP Ops console: custom tables, roles, a REST API under `/wp-json/tap/v1`, and a
Gravity Forms quote-form intake. The contract is in [`API.md`](API.md). Requires WordPress 6+, PHP 7.4+, nothing else.

## Install

1. Copy this folder to `wp-content/plugins/tap-ops/` and activate **TAP Ops**.
   Activation creates the tables (`{prefix}tap_*`) and the roles `tap_admin` / `tap_inspector` (capability `read` only).
   Tables are also created/upgraded lazily whenever the `tap_ops_db_version` option is behind.
2. Add to `wp-config.php` (above "That's all, stop editing"):

```php
define( 'TAP_API_KEY', 'a-long-random-secret' );   // required; every endpoint returns 503 without it
define( 'TAP_QUOTE_FORM_ID', 3 );                  // optional: Gravity Forms quote form id
define( 'TAP_ALLOW_DEV_SEED', true );              // optional, DEV ONLY: enables POST /dev/seed
```

3. Create users with `POST /users` (or seed in dev). Accounts default to active; set `active:false` to block them.
   "administrator" WP users count as admins too.

## Point Next.js at it

Server-side only (never expose the key to the browser):

```
WP_API_URL=https://your-wp-site.com/wp-json/tap/v1
WP_API_KEY=<same value as TAP_API_KEY>
```

Send `X-TAP-Key: $WP_API_KEY` on every request and `X-TAP-User: <wp user id>` for the acting user
(not needed for `POST /auth/login`, `POST /requests`, `POST /dev/seed`, `GET /audits/by-token/{token}`).
Errors are `{ "code", "message" }` with the HTTP status (401 bad key/credentials, 403 forbidden, 404, 409, 422, 429, 503).

## Gravity Forms

On `gform_after_submission` a **PENDING** customer request is created (`source` = `gravityforms:<form id>`) for the quote
form: the form whose id is `TAP_QUOTE_FORM_ID`, otherwise any form whose title contains "quote". Fields are matched by
label (First Name, Last Name, Company Name, Title, Street Address, Address Line 2, City, State, ZIP, Phone, Email, Date
Needed, Additional Info); a Name field maps `.3`/`.6`; an Address field maps `.1`-`.5`; checkbox choices go to
`trainings` when the field label contains "training", else `services`. Date Needed accepts m/d/Y, Y-m-d, d/m/Y.
Missing values are stored as empty strings / today's date, so a lead is never dropped. Customise with
`add_filter( 'tap_gf_map_entry', fn( $mapped, $entry, $form ) => $mapped, 10, 3 )`.
If Gravity Forms is not installed the hook simply never fires. The mapper is a plain function:
`tap_ops_map_gf_entry( $entry, $form )`.

## Try it locally (WordPress Playground, SQLite, no PHP/MySQL needed)

From this folder:

```
npx @wp-playground/cli server --port=9400 --auto-mount --blueprint=playground-blueprint.json
```

The blueprint defines `TAP_API_KEY = test-key-123` and `TAP_ALLOW_DEV_SEED = true` and activates the plugin.
Then seed and smoke-test (Git Bash / Linux / macOS):

```
curl -X POST -H "X-TAP-Key: test-key-123" http://127.0.0.1:9400/wp-json/tap/v1/dev/seed
BASE_URL=http://127.0.0.1:9400 KEY=test-key-123 bash tests/smoke.sh
```

Seed logins: `admin@tapsvs.com` and `inspector@tapsvs.com`, password `changeme123`.
