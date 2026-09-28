import Link from "next/link";
import { Suspense } from "react";
import { audits as auditsRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { auditStatus, type AuditStatus } from "@/lib/scoring";
import { AuditsFilterBar } from "@/components/audits/AuditsFilterBar";
import { AuditRowMenu } from "@/components/audits/AuditRowMenu";

const PAGE_SIZE = 20;

const STATUS_PILL_CLASS: Record<AuditStatus, string> = {
  "In Progress": "pending",
  "Pending Approval": "pending",
  Flagged: "danger",
  Cleared: "ok",
  Marginal: "warn",
};

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "All", page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  await requireUser();

  const audits = await auditsRepo.list({ q, noResponses: true });

  const withStatus = audits.map((a) => ({ ...a, computedStatus: auditStatus(a) }));
  const filtered = status === "All" ? withStatus : withStatus.filter((a) => a.computedStatus === status);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const groups = new Map<string, typeof pageItems>();
  for (const a of pageItems) {
    const key = a.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Audits</h1>
        <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`/api/export/audits?${new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "All" ? { status } : {}) }).toString()}`}
              className="btn ghost sm"
            >
              Export CSV
            </a>
            <Link href="/new-audit" className="btn primary sm">+ New Audit</Link>
        </div>
      </div>

      <Suspense>
        <AuditsFilterBar />
      </Suspense>

      {pageItems.length === 0 ? (
        <div className="card-soft" style={{ padding: 24, color: "var(--ink-2)" }}>No audits match your filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Array.from(groups.entries()).map(([date, rows]) => (
            <div key={date}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
                {date}
              </div>
              <div className="card" style={{ overflow: "visible" }}>
                {rows.map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "14px 18px",
                      borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--rule)",
                    }}
                  >
                    <Link href={`/audits/${a.id}`} style={{ flex: "1 1 160px", minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{a.customer.name}</div>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{a.docNumber}</span>
                      <span className={`pill ${STATUS_PILL_CLASS[a.computedStatus]}`}>{a.computedStatus}</span>
                      <AuditRowMenu auditId={a.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/audits?${new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "All" ? { status } : {}), page: String(p) }).toString()}`}
              className="btn ghost sm"
              style={{ background: p === page ? "var(--pill)" : undefined, color: p === page ? "var(--pill-ink)" : undefined }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
