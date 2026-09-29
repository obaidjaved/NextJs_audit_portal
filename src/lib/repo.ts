import postgresBackend from "@/lib/repo.postgres";
import wordpressBackend from "@/lib/repo.wordpress";

export * from "@/lib/repo-types";

// Which backend serves data: "postgres" (default — the live production site,
// its own Postgres database) or "wordpress" (the tap-ops plugin, used for the
// staging/backup deployment). Set DATA_BACKEND=wordpress in that deployment's
// environment variables; leave it unset everywhere else.
const backend = process.env.DATA_BACKEND === "wordpress" ? wordpressBackend : postgresBackend;

export const { users, customers, templates, audits, actions, requests, schedules } = backend;
