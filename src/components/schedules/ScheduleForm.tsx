"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedule } from "@/lib/actions/schedules";
import type { ScheduleFrequency } from "@/lib/schedule";
import { FREQUENCY_LABEL, todayLocalDateString } from "@/lib/schedule";

export function ScheduleForm({
  templates,
  customers,
}: {
  templates: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({
    title: "",
    templateId: templates[0]?.id ?? "",
    customerId: customers[0]?.id ?? "",
    frequency: "MONTHLY" as ScheduleFrequency,
    // Left blank until mount — the server's clock (usually UTC) and the
    // browser's local timezone can disagree on "today", so computing this
    // eagerly here would risk a hydration mismatch.
    startDate: "",
    active: true,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => (s.startDate ? s : { ...s, startDate: todayLocalDateString() }));
  }, []);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createSchedule(state);
        router.push(`/schedules`);
        void result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create schedule.");
      }
    });
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Schedule title
        <input className="input" value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Customer
        <select className="select" value={state.customerId} onChange={(e) => setState((s) => ({ ...s, customerId: e.target.value }))}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Template
        <select className="select" value={state.templateId} onChange={(e) => setState((s) => ({ ...s, templateId: e.target.value }))}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Frequency
        <select className="select" value={state.frequency} onChange={(e) => setState((s) => ({ ...s, frequency: e.target.value as ScheduleFrequency }))}>
          {(Object.keys(FREQUENCY_LABEL) as ScheduleFrequency[]).map((f) => (
            <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Start date
        <input className="input" type="date" value={state.startDate} onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))} />
      </label>

      {error && <div className="pill danger" style={{ width: "fit-content" }}>{error}</div>}

      <button
        type="button"
        className="btn primary"
        disabled={pending || !state.title || !state.templateId || !state.customerId || !state.startDate}
        onClick={save}
      >
        {pending ? "Creating…" : "Create Schedule"}
      </button>
    </div>
  );
}
