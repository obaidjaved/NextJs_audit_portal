import Link from "next/link";

export function WeekChart({ data, total }: { data: { label: string; count: number; isToday: boolean }[]; total: number }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="card panel">
      <div className="panel-top">
        <h3>This Week</h3>
        <Link href="/new-audit" className="round-btn" aria-label="New audit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </Link>
      </div>
      <div className="week-stat mono">{total}</div>
      <div className="week-stat-k">audits logged</div>
      <div className="bars">
        {data.map((d) => {
          const h = d.count ? Math.max(14, Math.round((d.count / max) * 100)) : 6;
          const cls = d.count === 0 ? "bar empty" : d.isToday ? "bar today" : "bar";
          return (
            <div key={d.label} className="bar-col">
              <div className={cls} style={{ height: `${h}%` }} title={`${d.count} audit${d.count === 1 ? "" : "s"}`} />
              <span className="d">{d.label[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
