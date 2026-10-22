// Vercel build: apply pending database migrations (Postgres deployment only),
// then build the app. The WordPress-backed deployment has no Prisma database,
// so it skips straight to the build.
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const usesPostgres = process.env.DATA_BACKEND !== "wordpress" && Boolean(process.env.DATABASE_URL);
if (usesPostgres) {
  console.log("Applying database migrations…");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log("Skipping database migrations (no Postgres backend configured).");
}

run("npx", ["next", "build"]);
