"use client";

import { useState, useTransition } from "react";
import { submitQuoteRequest } from "@/lib/actions/quote-requests";
import { SERVICE_GROUPS, TRAINING_OPTIONS, US_STATES } from "@/lib/quote-options";

const LABEL = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" } as const;
const SECTION = { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, margin: "0 0 14px" } as const;
const GRID = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 } as const;

const EMPTY = {
  firstName: "",
  lastName: "",
  companyName: "",
  title: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  dateNeeded: "",
  additionalInfo: "",
  website: "", // honeypot
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={LABEL}>
      <span>
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}

export function QuoteForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [services, setServices] = useState<string[]>([]);
  const [trainings, setTrainings] = useState<string[]>([]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [key]: e.target.value }));

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (services.length === 0) return setError("Choose at least one type of service.");
    if (trainings.length === 0) return setError("Choose at least one type of training, or N/A.");
    startTransition(async () => {
      try {
        await submitQuoteRequest({ ...f, services, trainings });
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  if (done) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <div className="pill ok" style={{ marginBottom: 14 }}>Request received</div>
        <h2 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Thank you, {f.firstName}.</h2>
        <p style={{ color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>
          Our team will review your scope and get back to you within 24 hours at {f.email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
        </label>
      </div>

      <section>
        <h2 style={SECTION}>Contact Information</h2>
        <div style={GRID}>
          <Field label="First Name" required>
            <input className="input" required maxLength={80} autoComplete="given-name" value={f.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Last Name" required>
            <input className="input" required maxLength={80} autoComplete="family-name" value={f.lastName} onChange={set("lastName")} />
          </Field>
          <Field label="Company Name" required>
            <input className="input" required maxLength={160} autoComplete="organization" value={f.companyName} onChange={set("companyName")} />
          </Field>
          <Field label="Title">
            <input className="input" maxLength={120} autoComplete="organization-title" value={f.title} onChange={set("title")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 style={SECTION}>Address Information</h2>
        <div style={GRID}>
          <Field label="Street Address" required>
            <input className="input" required maxLength={200} autoComplete="address-line1" value={f.street} onChange={set("street")} />
          </Field>
          <Field label="Address Line 2">
            <input className="input" maxLength={200} autoComplete="address-line2" value={f.street2} onChange={set("street2")} />
          </Field>
          <Field label="City" required>
            <input className="input" required maxLength={100} autoComplete="address-level2" value={f.city} onChange={set("city")} />
          </Field>
          <Field label="State" required>
            <select className="select" required value={f.state} onChange={set("state")}>
              <option value="">Select a state…</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="ZIP Code" required>
            <input className="input" required inputMode="numeric" pattern="\d{5}(-\d{4})?" title="5-digit ZIP code" autoComplete="postal-code" value={f.zip} onChange={set("zip")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 style={SECTION}>Communication Details</h2>
        <div style={GRID}>
          <Field label="Phone" required>
            <input className="input" required type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email" required>
            <input className="input" required type="email" autoComplete="email" value={f.email} onChange={set("email")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 style={SECTION}>Project Scope</h2>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 22px" }}>
          <legend style={{ ...LABEL, marginBottom: 10 }}>
            Type of Service <span style={{ color: "var(--danger)" }}>*</span> <span style={{ fontWeight: 500 }}>(choose as many as apply)</span>
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {SERVICE_GROUPS.map((g) => (
              <div key={g.group} className="card-soft" style={{ padding: 14 }}>
                {g.options.length > 1 || g.options[0] !== g.group ? (
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--accent-ink)", marginBottom: 8 }}>{g.group}</div>
                ) : null}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
                  {g.options.map((o) => (
                    <label key={o} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                      <input type="checkbox" checked={services.includes(o)} onChange={() => toggle(services, setServices, o)} style={{ marginTop: 3 }} />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: "none", padding: 0, margin: "0 0 22px" }}>
          <legend style={{ ...LABEL, marginBottom: 10 }}>
            Type of Training <span style={{ color: "var(--danger)" }}>*</span> <span style={{ fontWeight: 500 }}>(choose as many as apply)</span>
          </legend>
          <div className="card-soft" style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
            {TRAINING_OPTIONS.map((o) => (
              <label key={o} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={trainings.includes(o)} onChange={() => toggle(trainings, setTrainings, o)} style={{ marginTop: 3 }} />
                {o}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ maxWidth: 260 }}>
          <Field label="Date Needed" required>
            <input className="input" required type="date" value={f.dateNeeded} onChange={set("dateNeeded")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 style={SECTION}>Additional Info</h2>
        <textarea className="textarea" rows={5} maxLength={4000} value={f.additionalInfo} onChange={set("additionalInfo")} placeholder="Anything else we should know about your facility or scope?" />
      </section>

      {error && (
        <div className="pill danger" role="alert" style={{ whiteSpace: "normal", width: "fit-content", maxWidth: "100%" }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
