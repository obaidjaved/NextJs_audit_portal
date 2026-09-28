# TAP Ops Console: deploy to Vercel (plain Next.js, no WordPress)

This is a self-contained Next.js app. It stores its own data in Postgres and needs no WordPress site.
(A separate headless-WordPress version of this backend exists in `wordpress/tap-ops/` if you ever want it —
the app currently does **not** use it.)

## What you need
- A Vercel account.
- A Postgres database reachable from Vercel: **Vercel Postgres** (powered by Neon) is the easiest — created
  right inside your Vercel project, no separate account. Any other managed Postgres (Neon, Supabase, RDS) works too.
- Git repository (GitHub/GitLab/Bitbucket) for the `ops-console` folder.

## 1. Push the code
Push the contents of `ops-console/` to a new Git repository.

## 2. Create the project on Vercel
1. Vercel dashboard → **Add New → Project** → import the repository. Framework preset: **Next.js**. Root directory: the folder containing `package.json` (if the repo root *is* `ops-console`, leave it default).
2. Don't deploy yet — add the database first (next step), or deploy once and redeploy after adding env vars.

## 3. Add a Postgres database
**Vercel Postgres (recommended):**
1. In the project, **Storage → Create Database → Postgres**.
2. Connect it to the project. Vercel adds `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, etc. automatically.
3. Add one more environment variable yourself: **`DATABASE_URL`** = the same value as `POSTGRES_PRISMA_URL` shown in the Storage tab (Prisma reads `DATABASE_URL` specifically).

**Any other Postgres provider:** just set `DATABASE_URL` to its connection string (`postgres://user:pass@host:5432/db?sslmode=require`).

## 4. Environment variables
Project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string (see above) |
| `AUTH_SECRET` | random string — generate with `npx auth secret` |
| `NEXTAUTH_URL` | your production URL, e.g. `https://portal.tapsvs.com` (Vercel also sets `VERCEL_URL` automatically, which Auth.js trusts) |
| `BLOB_READ_WRITE_TOKEN` | optional, for photo uploads: **Storage → Create Database → Blob**, then copy its token here |

## 5. Run migrations and create the first admin
Migrations aren't run automatically on deploy. From your machine, with `DATABASE_URL` pointed at the **production** database:

```bash
cd ops-console
npm install
DATABASE_URL="<production connection string>" npx prisma migrate deploy
DATABASE_URL="<production connection string>" npx tsx prisma/seed.ts   # creates admin@tapsvs.com / changeme123
```
**Change that password immediately** after first login (Team page → Reset password), or edit `prisma/seed.ts` to use your own email/password before running it.

To add more staff later, sign in as admin and use the **Team** page — no database access needed.

## 6. Deploy
Push to your main branch (or click **Deploy** in Vercel). Vercel builds with `next build` and serves it.

## 7. Point WordPress at it
On tapsvs.com, add a "Client Portal" or "Ops Console" link/button to your production URL
(e.g. `https://portal.tapsvs.com`). The two sites are independent — WordPress just links out.

## Using the built-in quote form
`/request-quote` is a public page built into this app (no Gravity Forms needed). Submissions appear under
**Customers → New Customers** for an admin to approve or reject. Link tapsvs.com's "Request a Quote" button to
`https://portal.tapsvs.com/request-quote`, or keep your existing Gravity Form separately — they don't conflict,
you'd just be reviewing leads in two places.

## Local development
```bash
npm install
npx prisma dev -n opsconsole -P 51220 &     # or run: docker run -p 5432:5432 postgres, etc.
echo 'DATABASE_URL="postgres://postgres:postgres@localhost:51220/template1?sslmode=disable"' >> .env
echo 'AUTH_SECRET="dev-secret"' >> .env
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env
npx prisma migrate dev
npm run db:seed          # admin@tapsvs.com / changeme123
npm run db:seed-demo     # optional: sample customers, audits, actions
npm run dev              # or: npm run build && npm start
```

## Acceptance checklist
- [ ] Sign in as the seeded admin, then change the password.
- [ ] Create a template, a customer, and run one audit end to end.
- [ ] Fail one item on the audit; confirm an action appears under **Actions**.
- [ ] Submit `/request-quote` (in a private window, signed out) and approve it from **Customers → New Customers**.
- [ ] Create a public share link on a finished audit and open it signed out.
- [ ] Photo upload works (needs `BLOB_READ_WRITE_TOKEN`, else photos save to a `public/uploads` folder that doesn't persist on Vercel — set the token before relying on this in production).

## Troubleshooting
| Symptom | Cause |
|---|---|
| Build fails on `prisma generate` | `DATABASE_URL` missing at build time — Vercel needs it set as an env var, not just used locally |
| Login always fails | migrations/seed not run against the production database, or wrong `DATABASE_URL` |
| "Prisma Client could not connect" | Postgres provider requires `sslmode=require` in the connection string, or Vercel's IPs aren't allow-listed (rare with managed providers) |
| Photos don't persist | no `BLOB_READ_WRITE_TOKEN` set — Vercel's filesystem is ephemeral |
