import Link from "next/link";

export interface NextStep {
  count: number;
  text: string; // what the number is, e.g. "new leads waiting"
  action: string; // what to do about it, e.g. "Review leads"
  href: string;
  urgent?: boolean;
}

// "What should I do next?" — only the things that need attention right now, each a single click away.
export function NextSteps({ steps }: { steps: NextStep[] }) {
  const open = steps.filter((s) => s.count > 0);
  return (
    <section className="card-soft" aria-label="What to do next" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 className="disp" style={{ fontSize: 15, fontWeight: 800 }}>What to do next</h2>
        <Link href="/help" style={{ fontSize: 12.5 }}>
          How the portal works
        </Link>
      </div>
      {open.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>You&apos;re all caught up. Nothing needs your attention right now.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {open.map((s) => (
            <li key={s.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--rule)", flexWrap: "wrap" }}>
              <span
                className="mono"
                style={{
                  minWidth: 30,
                  textAlign: "center",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 13,
                  background: s.urgent ? "var(--danger)" : "var(--accent)",
                  color: "#fff",
                }}
              >
                {s.count}
              </span>
              <span style={{ flex: "1 1 200px", fontSize: 13.5 }}>{s.text}</span>
              <Link href={s.href} className="btn ghost sm">
                {s.action}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
