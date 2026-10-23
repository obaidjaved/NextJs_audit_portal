"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A modal "details" popup. Mount it to open it; it calls onClose when the user
// dismisses it (✕, Esc, or a click on the backdrop), so the parent unmounts it.
export function DetailsDialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dtl-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="dtl-panel">
        <div className="dtl-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="disp" style={{ fontSize: 18, fontWeight: 800, overflowWrap: "anywhere" }}>{title}</h2>
            {subtitle && <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 2, overflowWrap: "anywhere" }}>{subtitle}</p>}
          </div>
          <button type="button" className="btn ghost sm" aria-label="Close" onClick={() => ref.current?.close()}>
            ✕
          </button>
        </div>
        <div className="dtl-body">{children}</div>
      </div>
    </dialog>
  );
}

export function DetailField({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "dtl-wide" : undefined}>
      <div className="dt-field-label">{label}</div>
      <div style={{ fontSize: 13.5 }}>{children}</div>
    </div>
  );
}
