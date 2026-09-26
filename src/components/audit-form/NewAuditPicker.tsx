"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface PickerCustomer {
  id: string;
  name: string;
  site: string | null;
}

export interface PickerTemplate {
  id: string;
  name: string;
  category: string;
}

export function NewAuditPicker({
  customers,
  templates,
  initialCustomerId,
  initialTemplateId,
}: {
  customers: PickerCustomer[];
  templates: PickerTemplate[];
  initialCustomerId?: string;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  const filteredCustomers = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(customerSearch.trim().toLowerCase())),
    [customers, customerSearch],
  );
  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.name.toLowerCase().includes(templateSearch.trim().toLowerCase())),
    [templates, templateSearch],
  );

  const canContinue = Boolean(customerId && templateId);

  function goToStep2() {
    if (!canContinue) return;
    router.push(`/new-audit/${templateId}/${customerId}`);
  }

  return (
    <div className="picker-grid">
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>1. Select Customer</h3>
        <input
          className="input"
          placeholder="Search customers…"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {customers.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
              No customers yet. <Link href="/customers/new">Add a customer</Link> first.
            </p>
          ) : filteredCustomers.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No customers match &ldquo;{customerSearch}&rdquo;.</p>
          ) : (
            filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pick-card"
                data-selected={c.id === customerId}
                onClick={() => setCustomerId(c.id)}
                style={{ textAlign: "left", padding: "10px 14px" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                {c.site && <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{c.site}</div>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>2. Select Template</h3>
        <input
          className="input"
          placeholder="Search templates…"
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {templates.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
              No templates yet. <Link href="/templates/new">Create a template</Link> first.
            </p>
          ) : filteredTemplates.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No templates match &ldquo;{templateSearch}&rdquo;.</p>
          ) : (
            filteredTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                className="pick-card"
                data-selected={t.id === templateId}
                onClick={() => setTemplateId(t.id)}
                style={{ textAlign: "left", padding: "10px 14px" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{t.category}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <button type="button" className="btn" disabled={!canContinue} onClick={goToStep2}>
          Continue →
        </button>
      </div>
    </div>
  );
}
