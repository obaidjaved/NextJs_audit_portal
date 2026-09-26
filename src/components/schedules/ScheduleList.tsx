"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { setScheduleActive } from "@/lib/actions/schedules";
import { FREQUENCY_LABEL, nextDueDate, parseLocalDate, type ScheduleFrequency } from "@/lib/schedule";

export interface ScheduleRow {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  customerId: string;
  customerName: string;
  frequency: ScheduleFrequency;
  startDate: string; // "YYYY-MM-DD" date-only, not a full ISO instant
  active: boolean;
}

export function ScheduleList({ schedules }: { schedules: ScheduleRow[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Paused">("All");
  const [, startTransition] = useTransition();
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);

  const rows = useMemo(() => {
    return schedules
      .map((s) => ({ ...s, active: localActive[s.id] ?? s.active }))
      .filter((s) => s.title.toLowerCase().includes(search.trim().toLowerCase()) || s.customerName.toLowerCase().includes(search.trim().toLowerCase()))
      .filter((s) => (filter === "All" ? true : filter === "Active" ? s.active : !s.active));
  }, [schedules, search, filter, localActive]);

  function toggle(id: string, active: boolean) {
    setToggleError(null);
    setLocalActive((m) => ({ ...m, [id]: active }));
    startTransition(async () => {
      try {
        await setScheduleActive(id, active);
      } catch (err) {
        setLocalActive((m) => ({ ...m, [id]: !active }));
        setToggleError(err instanceof Error ? err.message : "Failed to update schedule.");
      }
    });
  }

  return (
    <div>
      {toggleError && (
        <div className="pill danger" style={{ marginBottom: 12, display: "inline-block" }}>
          {toggleError}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input placeholder="Search schedules…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-row">
          {(["All", "Active", "Paused"] as const).map((f) => (
            <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-soft" style={{ padding: 24, color: "var(--ink-2)" }}>No schedules match.</div>
      ) : (
        <div className="card">
          {rows.map((s, i) => {
            const due = nextDueDate(parseLocalDate(s.startDate), s.frequency);
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "14px 18px",
                  borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--rule)",
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    {s.customerName} · {s.templateName} · {FREQUENCY_LABEL[s.frequency]}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                    Next: {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className={`pill ${s.active ? "ok" : "warn"}`}>{s.active ? "Active" : "Paused"}</span>
                  <button type="button" className="btn ghost sm" onClick={() => toggle(s.id, !s.active)}>
                    {s.active ? "Pause" : "Resume"}
                  </button>
                  <Link href={`/new-audit?templateId=${s.templateId}&customerId=${s.customerId}`} className="btn primary sm">
                    Run Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
