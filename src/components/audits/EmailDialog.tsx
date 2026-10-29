"use client";

import { useState, useTransition } from "react";
import { sendAuditEmail } from "@/lib/actions/email";
import { unwrap } from "@/lib/actions/result";
import { MERGE_TAGS, applyMerge, type MergeValues } from "@/lib/email-merge";
import { DetailsDialog } from "@/components/ops/Dialog";

export interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  attachReport: boolean;
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

// Email the customer about an audit: pick one of the saved templates (or write your own); tick
// "Attach audit report" to send the report PDF with it.
export function EmailDialog({
  auditId,
  title,
  to: initialTo,
  values,
  completed,
  templates,
  canManage,
  onClose,
}: {
  auditId: string;
  title: string;
  to: string;
  values: MergeValues;
  completed: boolean; // only a completed, approved audit has a report to attach
  templates: EmailTemplateRow[];
  canManage?: boolean; // administrators can add and edit templates
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attach, setAttach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(applyMerge(t.subject, values));
    setBody(applyMerge(t.body, values));
    setAttach(t.attachReport && completed);
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await sendAuditEmail(auditId, { to, subject, body, attachReport: attach }));
        setSent(true);
        setTimeout(onClose, 1800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send the email.");
      }
    });
  }

  return (
    <DetailsDialog title="Email customer" subtitle={title} onClose={onClose}>
      {sent ? (
        <p style={{ fontWeight: 700, color: "var(--ok)" }}>Email sent{attach ? " with the report attached" : ""} ✓</p>
      ) : (
        <form onSubmit={send}>
          <div className="dtl-grid">
            <div className="dtl-wide">
              <Label>Template</Label>
              <select className="select" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
                <option value="">Write my own message</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {canManage && (
                <a href="/email-templates" style={{ display: "inline-block", marginTop: 6, fontSize: 12.5, textDecoration: "underline", color: "var(--ink-2)" }}>
                  Add or edit templates
                </a>
              )}
            </div>
            <div className="dtl-wide">
              <Label>To</Label>
              <input className="input" type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
            </div>
            <div className="dtl-wide">
              <Label>Subject</Label>
              <input className="input" required maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="dtl-wide">
              <Label>Message</Label>
              <textarea className="textarea" required rows={9} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
              <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
                Merge tags are filled in when sent: {MERGE_TAGS.map((t) => `{{${t.tag}}}`).join("  ")}
              </div>
            </div>
            <div className="dtl-wide">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, opacity: completed ? 1 : 0.55 }}>
                <input type="checkbox" checked={attach} disabled={!completed} onChange={(e) => setAttach(e.target.checked)} style={{ width: 18, height: 18 }} />
                Attach audit report (PDF)
              </label>
              {!completed && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>The report can be attached once the audit is completed and approved.</div>}
            </div>
          </div>

          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}

          <div className="dtl-foot" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>Cancel</button>
            <button type="submit" className="btn primary sm" disabled={pending}>{pending ? "Sending…" : "Send email"}</button>
          </div>
        </form>
      )}
    </DetailsDialog>
  );
}
