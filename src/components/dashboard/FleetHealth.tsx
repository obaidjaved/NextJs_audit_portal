import Link from "next/link";
import type { FleetHealth as FleetHealthData } from "@/lib/dashboard";

export function FleetHealth({ data }: { data: FleetHealthData }) {
  const segs = [
    { n: data.cleared, c: "var(--ok)" },
    { n: data.marginal, c: "var(--warn)" },
    { n: data.flagged, c: "var(--danger)" },
  ];

  return (
    <div className="card panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-top">
        <h3>Fleet Health</h3>
      </div>

      <div className="fleet-segs">
        {segs.map((s, i) => (
          <div key={i} className="fleet-seg" style={{ flex: s.n || 0.08, background: s.n ? s.c : "var(--rule)" }} />
        ))}
      </div>
      <div className="fleet-legend">
        <span>Cleared <b>{data.cleared}</b></span>
        <span>Marginal <b>{data.marginal}</b></span>
        <span>Flagged <b>{data.flagged}</b></span>
      </div>

      <div className="queue">
        <div className="queue-top">
          <h4>Follow-Up Queue</h4>
          <span className="queue-count mono">{data.queue.length}/{data.queueTotal}</span>
        </div>

        {data.queue.length === 0 ? (
          <div className="queue-empty">Nothing needs follow-up right now.</div>
        ) : (
          data.queue.map((a) => {
            const danger = a.draft || (a.score ?? 0) < 70;
            return (
              <Link key={a.id} href={`/audits/${a.id}`} className="queue-row">
                <div className="queue-ic" style={{ color: danger ? "var(--danger)" : "var(--warn)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div className="queue-body">
                  <div className="t">{a.title}</div>
                  <div className="d">{a.customerName} · {a.date.toLocaleDateString()}</div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
