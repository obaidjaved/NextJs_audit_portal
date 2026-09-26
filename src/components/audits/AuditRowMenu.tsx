"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { duplicateAudit } from "@/lib/actions/audits";

export function AuditRowMenu({ auditId }: { auditId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function duplicate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await duplicateAudit(auditId);
        setOpen(false);
        router.push(`/audits/${result.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to duplicate.");
      }
    });
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn ghost sm"
        style={{ width: 32, height: 32, padding: 0 }}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="Row actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          className="card-soft"
          style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 30, minWidth: 170, boxShadow: "var(--shadow-lg)", padding: 6 }}
        >
          <a
            href={`/audits/${auditId}/edit`}
            style={{ display: "block", padding: "8px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
          >
            Edit inspection
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              duplicate();
            }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
          >
            {pending ? "Duplicating…" : "Duplicate inspection"}
          </button>
          {error && <p style={{ fontSize: 11.5, color: "var(--danger)", padding: "4px 10px", margin: 0 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
