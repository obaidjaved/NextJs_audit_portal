"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface RecentTemplate {
  id: string;
  name: string;
}

export interface RecentCustomer {
  id: string;
  name: string;
}

export function QuickAccessAccordion({
  recentTemplates,
  recentCustomers,
  categories,
}: {
  recentTemplates: RecentTemplate[];
  recentCustomers: RecentCustomer[];
  categories: { name: string; count: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(0);

  const sections = [
    {
      title: "Recent Templates",
      body: (
        <div className="chip-row">
          {recentTemplates.map((t) => (
            <button key={t.id} type="button" className="mini-chip" onClick={() => router.push(`/templates/${t.id}`)}>
              <span className="dot" style={{ background: "var(--accent)" }} />
              {t.name}
            </button>
          ))}
          {recentTemplates.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>No templates yet.</span>}
        </div>
      ),
    },
    {
      title: "Recent Customers",
      body: (
        <div className="chip-row">
          {recentCustomers.map((c) => (
            <button key={c.id} type="button" className="mini-chip" onClick={() => router.push(`/customers?customerId=${c.id}`)}>
              <span className="dot" style={{ background: "var(--sun)" }} />
              {c.name}
            </button>
          ))}
          {recentCustomers.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>No customers yet.</span>}
        </div>
      ),
    },
    {
      title: "Template Categories",
      body: (
        <div className="chip-row">
          {categories.map((c) => (
            <span key={c.name} className="mini-chip">
              <span className="dot" style={{ background: "var(--ok)" }} />
              {c.name} · {c.count}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Data & Exports",
      body: (
        <p style={{ fontStyle: "normal", margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>
          Open any completed audit and use Export PDF to generate a printable report.
        </p>
      ),
    },
  ];

  return (
    <div className="card panel">
      <div className="panel-top">
        <h3>Quick Access</h3>
      </div>
      <div>
        {sections.map((s, i) => (
          <div key={s.title} className={`accordion-item${open === i ? " open" : ""}`}>
            <button type="button" className="accordion-head" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{s.title}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="accordion-body">
              <div className="accordion-body-in">{s.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
