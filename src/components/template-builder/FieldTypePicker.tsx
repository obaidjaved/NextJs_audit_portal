"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FIELD_TYPES, FIELD_TYPE_MAP, type FieldType } from "@/lib/field-types";
import { FieldTypeIcon } from "./FieldTypeIcon";

const PANEL_WIDTH = 280;
const VIEWPORT_MARGIN = 12;

export function FieldTypePicker({
  value,
  onChange,
}: {
  value: FieldType;
  onChange: (type: FieldType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ left: number; width: number }>({ left: 0, width: PANEL_WIDTH });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Keep the popover within the viewport — its trigger can sit anywhere in a
  // wrapped flex row, so a naive left:0 offset can push it off-screen on
  // narrow viewports.
  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(PANEL_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
      let left = 0; // relative to trigger's left edge
      const desiredAbsoluteLeft = rect.left;
      const overflowRight = desiredAbsoluteLeft + width - (viewportWidth - VIEWPORT_MARGIN);
      if (overflowRight > 0) left -= overflowRight;
      const overflowLeft = desiredAbsoluteLeft + left - VIEWPORT_MARGIN;
      if (overflowLeft < 0) left -= overflowLeft;
      setPanelStyle({ left, width });
    }

    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [open]);

  const current = FIELD_TYPE_MAP[value];
  const filtered = FIELD_TYPES.filter((f) => f.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={rootRef} style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        className="input"
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "100%" }}
        onClick={() => setOpen((o) => !o)}
      >
        <FieldTypeIcon type={current.type} colorToken={current.colorToken} />
        <span style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.label}</span>
        <ChevronDown size={16} style={{ marginLeft: "auto", color: "var(--ink-2)", flex: "none" }} />
      </button>

      {open && (
        <div
          className="card-soft"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: panelStyle.left,
            width: panelStyle.width,
            zIndex: 40,
            boxShadow: "var(--shadow-lg)",
            padding: 8,
          }}
        >
          <input
            autoFocus
            className="input"
            placeholder="Search field types…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 280, overflowY: "auto" }} role="listbox">
            {filtered.map((f) => (
              <li key={f.type}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.type === value}
                  onClick={() => {
                    onChange(f.type);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "none",
                    background: f.type === value ? "var(--rule)" : "transparent",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  <FieldTypeIcon type={f.type} colorToken={f.colorToken} />
                  {f.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li style={{ padding: "10px", fontSize: 13, color: "var(--ink-2)" }}>No matching field types.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
