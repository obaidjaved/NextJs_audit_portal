"use client";

import { useEffect } from "react";

// Shown inside the app shell when a page fails while loading (most often the WordPress backend being slow to answer).
// The sidebar stays usable, and "Try again" re-runs the page without a full reload.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card-soft" style={{ padding: 28, maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
      <h1 className="disp" style={{ fontSize: 20, fontWeight: 800 }}>This page couldn&apos;t load</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, margin: "8px 0 16px" }}>
        The server took too long to answer. This is usually temporary — try again in a moment.
      </p>
      <button type="button" className="btn primary" onClick={reset}>
        Try again
      </button>
      {error.digest && <p className="mono" style={{ color: "var(--ink-3, var(--ink-2))", fontSize: 11, marginTop: 16 }}>Error {error.digest}</p>}
    </div>
  );
}
