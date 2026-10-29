import { fmtDate } from "@/components/ops/Parts";
import type { AuditRow } from "@/lib/audit-rows";

// The auditor's Schedules page: the jobs assigned to them that are still open, soonest first.
export function AuditorSchedule({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
        Nothing is scheduled for you right now.
      </div>
    );
  }

  const name = (r: AuditRow) => (
    <div className="dt-contact">
      <span className="dt-contact-name">{r.company}</span>
      <span className="dt-contact-co">{r.client || "—"}</span>
      <span className="dt-contact-line mono">{r.code ?? "No audit yet"}</span>
    </div>
  );

  return (
    <>
      <div className="dt-wrap">
        <table className="dt">
          <colgroup>
            <col style={{ width: "32%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "34%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Date of assignment</th>
              <th>Date of service needed</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{name(r)}</td>
                <td>{fmtDate(r.assignedAt)}</td>
                <td>{fmtDate(r.neededBy)}</td>
                <td>{r.address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dt-cards">
        {rows.map((r) => (
          <div key={r.key} className="card dt-card">
            {name(r)}
            <div className="dt-card-grid">
              <div>
                <div className="dt-field-label">Assigned on</div>
                {fmtDate(r.assignedAt)}
              </div>
              <div>
                <div className="dt-field-label">Service needed</div>
                {fmtDate(r.neededBy)}
              </div>
              <div className="dt-wide">
                <div className="dt-field-label">Address</div>
                {r.address || "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
