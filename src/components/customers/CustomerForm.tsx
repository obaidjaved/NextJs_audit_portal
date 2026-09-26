"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

export function CustomerForm({
  customerId,
  initial,
}: {
  customerId?: string;
  initial?: { name: string; site: string; city: string; state: string; zip: string; contact: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({
    name: initial?.name ?? "",
    site: initial?.site ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
    contact: initial?.contact ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
  });

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const result = customerId ? await updateCustomer(customerId, state) : await createCustomer(state);
        router.push(`/customers?customerId=${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save customer.");
      }
    });
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Customer / company name
        <input className="input" value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Site / street address
        <input className="input" value={state.site} onChange={(e) => setState((s) => ({ ...s, site: e.target.value }))} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        City
        <input className="input" value={state.city} onChange={(e) => setState((s) => ({ ...s, city: e.target.value }))} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
          State
          <input className="input" value={state.state} onChange={(e) => setState((s) => ({ ...s, state: e.target.value }))} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
          ZIP
          <input className="input" value={state.zip} onChange={(e) => setState((s) => ({ ...s, zip: e.target.value }))} />
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Contact name
        <input className="input" value={state.contact} onChange={(e) => setState((s) => ({ ...s, contact: e.target.value }))} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Email
        <input className="input" type="email" value={state.email} onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>
        Phone
        <input className="input" type="tel" value={state.phone} onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))} />
      </label>

      {error && <div className="pill danger" style={{ width: "fit-content" }}>{error}</div>}

      <button type="button" className="btn primary" disabled={pending || !state.name} onClick={save}>
        {pending ? "Saving…" : customerId ? "Save Changes" : "Create Customer"}
      </button>
    </div>
  );
}
