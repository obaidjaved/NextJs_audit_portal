import { serviceTypesOf } from "@/lib/ops-options";

// Name / Title | Company / Email / Phone, stacked — the first column of both dashboards.
export function ContactCell({
  name,
  title,
  company,
  email,
  phone,
}: {
  name: string;
  title?: string | null;
  company: string;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="dt-contact">
      {name && <div className="dt-contact-name">{name}</div>}
      <div className="dt-contact-co">{[title, company].filter(Boolean).join(" | ")}</div>
      {email && <div className="dt-contact-line">{email}</div>}
      {phone && <div className="dt-contact-line">{phone}</div>}
    </div>
  );
}

export function CallEmail({ email, phone }: { email?: string | null; phone?: string | null }) {
  return (
    <div className="dt-actions">
      {phone ? (
        <a className="btn primary sm" href={`tel:${phone}`}>Call Now</a>
      ) : (
        <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.45, cursor: "not-allowed" }}>Call Now</span>
      )}
      {email ? (
        <a className="btn ghost sm" href={`mailto:${email}`}>Email</a>
      ) : (
        <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.45, cursor: "not-allowed" }}>Email</span>
      )}
    </div>
  );
}

export function ServiceChips({ services, kind }: { services: string[]; kind: "type" | "sub" }) {
  const items = kind === "type" ? serviceTypesOf(services) : services;
  if (items.length === 0) return <span style={{ color: "var(--ink-3)" }}>—</span>;
  return (
    <div className="dt-chips">
      {items.map((s) => (
        <span key={s} className={`pill ${kind === "type" ? "accent" : "pending"}`} style={{ textTransform: "none", letterSpacing: 0, whiteSpace: "normal" }}>
          {s}
        </span>
      ))}
    </div>
  );
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
