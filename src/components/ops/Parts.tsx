import { Mail, Phone } from "lucide-react";
import { serviceTypesOf } from "@/lib/ops-options";

// Name / Title | Company / Email / Phone, stacked — the first column of both dashboards.
export function ContactCell({
  name,
  title,
  company,
  email,
  phone,
  compact,
}: {
  name: string;
  title?: string | null;
  company: string;
  email?: string | null;
  phone?: string | null;
  compact?: boolean; // name + company only
}) {
  return (
    <div className="dt-contact">
      {name && <div className="dt-contact-name">{name}</div>}
      <div className="dt-contact-co">{[title, company].filter(Boolean).join(" | ")}</div>
      {!compact && email && <div className="dt-contact-line">{email}</div>}
      {!compact && phone && <div className="dt-contact-line">{phone}</div>}
    </div>
  );
}

const DISABLED = { opacity: 0.45, cursor: "not-allowed" } as const;

// "Call Now" and "Email". `compact` = round icon buttons for table rows.
export function CallEmail({
  email,
  phone,
  compact,
  onEmail,
}: {
  email?: string | null;
  phone?: string | null;
  compact?: boolean;
  onEmail?: () => void; // open an in-app email form instead of the mail app
}) {
  if (compact) {
    return (
      <>
        {phone ? (
          <a className="dt-icon-btn" href={`tel:${phone}`} aria-label="Call now" title="Call now"><Phone size={15} /></a>
        ) : (
          <span className="dt-icon-btn" aria-disabled="true" style={DISABLED}><Phone size={15} /></span>
        )}
        {onEmail ? (
          <button type="button" className="dt-icon-btn" onClick={onEmail} aria-label="Email" title="Email" style={{ cursor: "pointer" }}><Mail size={15} /></button>
        ) : email ? (
          <a className="dt-icon-btn" href={`mailto:${email}`} aria-label="Email" title="Email"><Mail size={15} /></a>
        ) : (
          <span className="dt-icon-btn" aria-disabled="true" style={DISABLED}><Mail size={15} /></span>
        )}
      </>
    );
  }
  return (
    <div className="dt-actions">
      {phone ? (
        <a className="btn primary sm" href={`tel:${phone}`}>Call Now</a>
      ) : (
        <span className="btn ghost sm" aria-disabled="true" style={DISABLED}>Call Now</span>
      )}
      {email ? (
        <a className="btn ghost sm" href={`mailto:${email}`}>Email</a>
      ) : (
        <span className="btn ghost sm" aria-disabled="true" style={DISABLED}>Email</span>
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

const PAY_TONE: Record<string, string> = { "Full Payment": "ok", Partial: "warn", None: "pending" };

export function PaymentPill({ status }: { status: string }) {
  return (
    <span className={`pill ${PAY_TONE[status] ?? "pending"}`} style={{ textTransform: "none", letterSpacing: 0 }}>
      {status === "None" ? "No payment" : status}
    </span>
  );
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
