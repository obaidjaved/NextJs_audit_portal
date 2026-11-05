// The animated showcase beside the sign-in form. Purely decorative: it is hidden from screen readers, and every
// animation is pure CSS (see login.css), so it costs no JavaScript and respects "reduce motion".

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="brand-mark">
      <rect width="40" height="40" rx="12" fill="#FF7A1A" />
      <path d="M20 9.5 29 13v6.6c0 5.3-3.6 9.2-9 10.9-5.4-1.7-9-5.6-9-10.9V13l9-3.5Z" fill="#17161B" />
      <path className="brand-check" d="m15.6 19.9 3.1 3.1 5.8-6.2" stroke="#FFB067" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHECKS = ["Panel labels verified", "Breaker ratings recorded", "Photos attached", "Signature captured"];
const STEPS = ["Schedule", "Inspect", "Review", "Send"];
const HEADLINE = ["Every", "audit,", "from", "inspection", "to", "approval."];

export function LoginHero() {
  return (
    <aside className="login-hero">
      <span className="login-orb orb-a" aria-hidden="true" />
      <span className="login-orb orb-b" aria-hidden="true" />
      <span className="login-orb orb-c" aria-hidden="true" />
      <span className="login-grid" aria-hidden="true" />

      <div className="login-hero-top">
        <BrandMark size={38} />
        <span className="disp login-wordmark">TAP Ops Console</span>
      </div>

      <div className="login-hero-copy">
        <h2 className="disp login-headline">
          {HEADLINE.map((w, i) => (
            <span key={w} className={`w${i >= 3 ? " hot" : ""}`} style={{ ["--i" as string]: i }}>
              {w}
            </span>
          ))}
        </h2>
        <p className="login-lede">Schedule the work, capture it on site, review it and send the finished report, all in one place.</p>
      </div>

      <div className="login-stage" aria-hidden="true">
        <div className="login-chip login-chip-a">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
          Photos attached
        </div>

        <div className="audit-card">
          <div className="audit-head">
            <div>
              <div className="audit-title">Electrical Safety Audit</div>
              <div className="audit-meta">EL-0009 · On site today</div>
            </div>
            <div className="audit-pill">
              <span className="pill-a">In progress</span>
              <span className="pill-b">Approved</span>
            </div>
          </div>

          <ul className="audit-rows">
            {CHECKS.map((c, i) => (
              <li key={c} className={`audit-row r${i}`}>
                <span className="audit-dot">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="m3 7.4 2.6 2.6L11 4.4" stroke="#1a0d02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="14" />
                  </svg>
                </span>
                <span className="audit-label">{c}</span>
              </li>
            ))}
          </ul>

          <div className="audit-progress">
            <div className="audit-bar">
              <span className="audit-bar-fill" />
            </div>
            <span className="audit-pct" />
          </div>
        </div>

        <div className="login-chip login-chip-b">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16v12H4z" />
            <path d="m4 7 8 6 8-6" />
          </svg>
          Report sent to client
        </div>
      </div>

      <ol className="login-steps" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li key={s} style={{ ["--i" as string]: i }}>
            <span className="step-n">0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </aside>
  );
}
