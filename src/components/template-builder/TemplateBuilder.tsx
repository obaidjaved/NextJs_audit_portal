"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TemplateField } from "@/lib/field-types";
import { createTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/templates";
import { FieldList, newField } from "./FieldList";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { ReportPreviewPanel } from "./ReportPreviewPanel";
import { ReportStyleEditor } from "./ReportStyleEditor";

export interface TemplateFormState {
  name: string;
  category: "ELECTRICAL" | "PLUMBING" | "HVAC" | "SAFETY" | "GENERAL";
  fields: TemplateField[];
  approvalRequired: boolean;
  reportStyle: "MODERN" | "CLASSIC";
  reportAccentColor: string | null;
  reportLogo: string | null;
}

const CATEGORIES: TemplateFormState["category"][] = ["ELECTRICAL", "PLUMBING", "HVAC", "SAFETY", "GENERAL"];

export function TemplateBuilder({
  templateId,
  initial,
}: {
  templateId?: string;
  initial?: Partial<TemplateFormState>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"build" | "report">("build");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<TemplateFormState>({
    name: initial?.name ?? "",
    category: initial?.category ?? "ELECTRICAL",
    fields: initial?.fields ?? [newField()],
    approvalRequired: initial?.approvalRequired ?? false,
    reportStyle: initial?.reportStyle ?? "MODERN",
    reportAccentColor: initial?.reportAccentColor ?? null,
    reportLogo: initial?.reportLogo ?? null,
  });

  function validate(): string | null {
    if (!state.name.trim()) return "Give the template a name.";
    if (state.fields.length === 0) return "Add at least one field.";
    const unlabeled = state.fields.findIndex((f) => !f.label.trim());
    if (unlabeled !== -1) return `Field ${unlabeled + 1} needs a label.`;
    const emptyChoice = state.fields.find((f) => f.type === "choice" && (!f.options || f.options.length === 0));
    if (emptyChoice) return `"${emptyChoice.label}" needs at least one option.`;
    return null;
  }

  function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setTab("build");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = templateId ? await updateTemplate(templateId, state) : await createTemplate(state);
        router.push(`/templates/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save template.");
      }
    });
  }

  function remove() {
    if (!templateId) return;
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
        router.push("/templates");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete template.");
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div className="seg-toggle" style={{ maxWidth: 340 }}>
          <button type="button" className={tab === "build" ? "active" : ""} onClick={() => setTab("build")}>
            Build Template
          </button>
          <button type="button" className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>
            Edit Report
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {templateId && (
            <button type="button" className="btn ghost sm" onClick={remove} disabled={pending}>
              Delete
            </button>
          )}
          <button type="button" className="btn primary sm" onClick={save} disabled={pending || !state.name || state.fields.length === 0}>
            {pending ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>

      {error && (
        <div className="pill danger" style={{ marginBottom: 16, display: "block", width: "fit-content" }}>
          {error}
        </div>
      )}

      <div className="tb-panel-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              className="input"
              placeholder="Template name"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              style={{ fontSize: 15, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <select
                className="select"
                value={state.category}
                onChange={(e) => setState((s) => ({ ...s, category: e.target.value as TemplateFormState["category"] }))}
                style={{ width: 180 }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                <input
                  type="checkbox"
                  checked={state.approvalRequired}
                  onChange={(e) => setState((s) => ({ ...s, approvalRequired: e.target.checked }))}
                />
                Requires approval before completion
              </label>
            </div>
          </div>

          {tab === "build" ? (
            <FieldList fields={state.fields} onChange={(fields) => setState((s) => ({ ...s, fields }))} />
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <ReportStyleEditor
                reportStyle={state.reportStyle}
                reportAccentColor={state.reportAccentColor}
                reportLogo={state.reportLogo}
                onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
              />
            </div>
          )}
        </div>

        {tab === "build" ? (
          <LivePreviewPanel fields={state.fields} templateName={state.name} />
        ) : (
          <ReportPreviewPanel
            fields={state.fields}
            templateName={state.name}
            style={state.reportStyle}
            accentColor={state.reportAccentColor}
            logo={state.reportLogo}
          />
        )}
      </div>
    </div>
  );
}
