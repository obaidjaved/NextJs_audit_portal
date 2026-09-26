import { audits as auditsRepo, actions as actionsRepo, customers as customersRepo } from "@/lib/wp/repo";
import { requireUser } from "@/lib/access";
import { computeAnalytics, type GroupStat } from "@/lib/analytics";
import { dateOnlyStringUTC } from "@/lib/schedule";

const LABEL = { fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em" } as const;
const scoreColor = (n: number) => (n >= 90 ? "var(--ok)" : n >= 70 ? "var(--warn)" : "var(--danger)");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  await requireUser();
  const { customerId } = await searchParams;

  const [rows, customerRows, actionList] = await Promise.all([
    auditsRepo.list({ customerId }),
    customersRepo.list(),
    actionsRepo.list({ customerId }),
  ]);
  const customers = customerRows.map((c) => ({ id: c.id, name: c.name }));
  const openList = actionList.filter((a) => a.status !== "RESOLVED");
  const openActions = openList.length;

  const todayKey = dateOnlyStringUTC(new Date());
  const overdue = openList.filter((a) => a.dueDate && a.dueDate < todayKey).length;

  const data = computeAnalytics(rows.map((r) => ({ ...r, customerName: r.customer.name, templateName: r.template.name })));
  const maxCount = Math.max(1, ...data.months.map((m) => m.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Analytics</h1>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <select className="select" name="customerId" defaultValue={customerId ?? ""} aria-label="Customer" style={{ minWidth: 200 }}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="btn ghost sm">Apply</button>
        </form>
      </div>

      {data.total === 0 ? (
        <div className="card-soft" style={{ padding: 24, color: "var(--ink-2)" }}>
          No completed inspections yet. Analytics appear once audits are submitted.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <Kpi label="Completed audits" value={String(data.total)} />
            <Kpi label="Average score" value={data.avgScore === null ? "—" : `${data.avgScore}%`} color={data.avgScore === null ? undefined : scoreColor(data.avgScore)} />
            <Kpi label="Cleared rate" value={data.passRate === null ? "—" : `${data.passRate}%`} />
            <Kpi label="Flagged" value={String(data.statuses.Flagged)} color={data.statuses.Flagged ? "var(--danger)" : undefined} />
            <Kpi label="Open actions" value={String(openActions)} />
            <Kpi label="Overdue actions" value={String(overdue)} color={overdue ? "var(--danger)" : undefined} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ ...LABEL, marginBottom: 12 }}>Inspections and average score, last 12 months</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 6, alignItems: "end", height: 150 }}>
              {data.months.map((m) => (
                <div key={m.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4, minWidth: 0 }}>
                  <span className="mono" style={{ fontSize: 10, color: m.avg === null ? "var(--ink-3)" : scoreColor(m.avg) }}>{m.avg ?? ""}</span>
                  <div
                    title={`${m.count} audit${m.count === 1 ? "" : "s"}`}
                    style={{
                      width: "100%",
                      maxWidth: 34,
                      height: `${(m.count / maxCount) * 100}%`,
                      minHeight: m.count ? 4 : 0,
                      background: m.avg === null ? "var(--rule-2)" : scoreColor(m.avg),
                      borderRadius: 6,
                      opacity: 0.85,
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 6, marginTop: 6 }}>
              {data.months.map((m) => (
                <span key={m.key} style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center" }}>{m.label}</span>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10 }}>Bar height is the number of audits; colour and label are the average score.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <GroupCard title="By customer" rows={data.byCustomer} />
            <GroupCard title="By template" rows={data.byTemplate} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ ...LABEL, marginBottom: 12 }}>Most frequent problem items</div>
            {data.topFindings.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No failed or marginal items recorded.</p>
            ) : (
              data.topFindings.map((f) => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--rule)", fontSize: 13.5 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
                  {f.fails > 0 && <span className="pill danger">{f.fails} fail</span>}
                  {f.marginals > 0 && <span className="pill warn">{f.marginals} marginal</span>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</div>
    </div>
  );
}

function GroupCard({ title, rows }: { title: string; rows: GroupStat[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ ...LABEL, marginBottom: 12 }}>{title}</div>
      {rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, marginBottom: 4 }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{r.name}</span>
            <span className="mono" style={{ flex: "none", color: "var(--ink-2)" }}>
              {r.count} audit{r.count === 1 ? "" : "s"} · {r.avg}%
            </span>
          </div>
          <div style={{ height: 8, background: "var(--bg1)", borderRadius: 999 }}>
            <div style={{ width: `${Math.min(100, Math.max(0, r.avg))}%`, height: "100%", background: scoreColor(r.avg), borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
