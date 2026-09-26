"use client";

import { CALENDAR_DOW_LABELS, getMonthGrid, isSameDay, monthLabel } from "@/lib/calendar";

export interface CalendarEvent {
  date: Date;
  label: string;
  colorToken: string;
  initial: string;
}

export function CalendarGrid({
  year,
  month,
  events,
  onMonthChange,
  onDayClick,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onMonthChange: (year: number, month: number) => void;
  onDayClick?: (date: Date) => void;
}) {
  const cells = getMonthGrid(year, month);

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  }
  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  }

  return (
    <div>
      <div className="cal-head">
        <h3>{monthLabel(year, month)}</h3>
        <div className="cal-nav">
          <button type="button" onClick={prevMonth} aria-label="Previous month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button type="button" onClick={nextMonth} aria-label="Next month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {CALENDAR_DOW_LABELS.map((d) => (
          <div key={d} className="cal-dow" style={{ textAlign: "center", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, cell.date));
          return (
            <div
              key={i}
              className="cal-cell"
              style={{ opacity: cell.inMonth ? 1 : 0.35, cursor: onDayClick ? "pointer" : "default" }}
              onClick={() => onDayClick?.(cell.date)}
            >
              <div className="num mono" style={{ fontSize: 11.5, marginBottom: 4, color: "var(--ink-2)" }}>
                {cell.date.getDate()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayEvents.slice(0, 3).map((e, j) => (
                  <div
                    key={j}
                    className="cal-event"
                    style={{ background: `var(${e.colorToken}-soft, var(--rule))`, color: `var(${e.colorToken})` }}
                    title={e.label}
                  >
                    <span className="ea" style={{ background: `var(${e.colorToken})`, color: "#fff" }}>
                      {e.initial}
                    </span>
                    <span className="en">{e.label}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span style={{ fontSize: 9.5, color: "var(--ink-3)" }}>+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
