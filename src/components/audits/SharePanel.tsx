"use client";

import { useEffect, useState, useTransition } from "react";
import { setAuditSharing } from "@/lib/actions/audits";

export function SharePanel({ auditId, initialToken, canShare }: { auditId: string; initialToken: string | null; canShare: boolean }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Origin is only known in the browser; filling it after mount avoids a
  // server/client mismatch on the input's value.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);
  const url = token ? `${origin}/share/${token}` : "";

  function toggle(enabled: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await setAuditSharing(auditId, enabled);
        setToken(res.shareToken);
        setCopied(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update sharing.");
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select the link and copy it manually.");
    }
  }

  return (
    <div className="card-soft no-print" style={{ padding: 16, maxWidth: 760, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
        Share with client
      </div>
      {token ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input className="input mono" readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: "1 1 260px", fontSize: 12 }} />
          <button type="button" className="btn ghost sm" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          <button type="button" className="btn ghost sm" disabled={pending} onClick={() => toggle(false)}>Revoke</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn ghost sm" disabled={pending || !canShare} onClick={() => toggle(true)}>
            {pending ? "Creating…" : "Create public link"}
          </button>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {canShare ? "Anyone with the link can view this report (read-only)." : "Submit and approve the audit before sharing."}
          </span>
        </div>
      )}
      {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
