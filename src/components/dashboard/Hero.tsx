import { NavIcons } from "@/components/shell/navIcons";

export function Hero({
  userName,
  totalAudits,
  flaggedCount,
  cleared,
  marginal,
  inProgress,
  flagged,
  templateCount,
  customerCount,
}: {
  userName: string;
  totalAudits: number;
  flaggedCount: number;
  cleared: number;
  marginal: number;
  inProgress: number;
  flagged: number;
  templateCount: number;
  customerCount: number;
}) {
  const firstName = userName.split(" ")[0];

  return (
    <div className="hero">
      <div>
        <h1>Welcome back, {firstName}</h1>
        <p className="sub">
          {totalAudits} audit{totalAudits === 1 ? "" : "s"} on record · {flaggedCount} flagged for follow-up
        </p>
        <div className="metric-row" style={{ marginTop: 14 }}>
          <div className="metric">
            <span className="lbl">Cleared</span>
            <div className="track ok">{cleared} audits</div>
          </div>
          <div className="metric">
            <span className="lbl">Marginal</span>
            <div className="track sun">{marginal} audits</div>
          </div>
          <div className="metric">
            <span className="lbl">In Review</span>
            <div className="track warn">{inProgress} draft</div>
          </div>
          <div className="metric">
            <span className="lbl">Flagged</span>
            <div className="track danger">{flagged} open</div>
          </div>
        </div>
      </div>

      <div className="big-stats">
        <div className="big-stat">
          <div className="ic">{NavIcons.templates}</div>
          <div>
            <div className="n mono">{templateCount}</div>
            <div className="k">Templates</div>
          </div>
        </div>
        <div className="big-stat">
          <div className="ic">{NavIcons.customers}</div>
          <div>
            <div className="n mono">{customerCount}</div>
            <div className="k">Customers</div>
          </div>
        </div>
        <div className="big-stat">
          <div className="ic">{NavIcons.audits}</div>
          <div>
            <div className="n mono">{totalAudits}</div>
            <div className="k">Audits</div>
          </div>
        </div>
      </div>
    </div>
  );
}
