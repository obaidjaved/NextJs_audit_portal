"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEmailTemplate, saveEmailTemplate } from "@/lib/actions/email";
import { unwrap } from "@/lib/actions/result";
import { MERGE_TAGS } from "@/lib/email-merge";
import { DetailsDialog } from "@/components/ops/Dialog";
import type { EmailTemplateRow } from "./EmailDialog";

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

function TemplateForm({ template, onClose }: { template: EmailTemplateRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [attach, setAttach] = useState(template?.attachReport ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await saveEmailTemplate(template?.id ?? null, { name, subject, body, attachReport: attach }));
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the template.");
      }
    });
  }

  return (
    <DetailsDialog title={template ? "Edit template" : "New template"} onClose={onClose}>
      <form onSubmit={save}>
        <div className="dtl-grid">
          <div className="dtl-wide">
            <Label>Template name</Label>
            <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Send audit report" />
          </div>
          <div className="dtl-wide">
            <Label>Subject</Label>
            <input className="input" required maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="dtl-wide">
            <Label>Message</Label>
            <textarea className="textarea" required rows={10} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {MERGE_TAGS.map((t) => (
                <button key={t.tag} type="button" className="pill accent" style={{ cursor: "pointer", border: "none", textTransform: "none", letterSpacing: 0 }} title={t.label} onClick={() => setBody((b) => `${b}{{${t.tag}}}`)}>
                  {`{{${t.tag}}}`}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>Click a tag to add it to the message.</div>
          </div>
          <div className="dtl-wide">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} style={{ width: 18, height: 18 }} />
              Attach the audit report (PDF) by default
            </label>
          </div>
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}
        <div className="dtl-foot" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>Cancel</button>
          <button type="submit" className="btn primary sm" disabled={pending}>{pending ? "Saving…" : "Save template"}</button>
        </div>
      </form>
    </DetailsDialog>
  );
}

export function EmailTemplatesManager({ templates }: { templates: EmailTemplateRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EmailTemplateRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(t: EmailTemplateRow) {
    if (!confirm(`Delete the template “${t.name}”?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await deleteEmailTemplate(t.id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete the template.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: pending ? 0.7 : 1 }}>
      <div>
        <button type="button" className="btn primary sm" onClick={() => setEditing("new")}>+ New template</button>
      </div>
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      {templates.length === 0 && <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)" }}>No templates yet.</div>}
      {templates.map((t) => (
        <div key={t.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <div style={{ fontWeight: 800 }}>
              {t.name} {t.attachReport && <span className="pill ok" style={{ marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>Attaches report</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn ghost sm" onClick={() => setEditing(t)}>Edit</button>
              <button type="button" className="btn ghost sm" onClick={() => remove(t)} disabled={pending}>Delete</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            <strong style={{ color: "var(--ink)" }}>Subject:</strong> {t.subject}
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 110, overflow: "hidden" }}>{t.body}</p>
        </div>
      ))}
      {editing && <TemplateForm template={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
