"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TemplateField } from "@/lib/field-types";
import { buildResponse, fieldAlwaysSatisfied } from "@/lib/field-types";
import { responseHasValue, type ResponseObject } from "@/lib/scoring";
import { uploadFile } from "@/lib/upload";
import { saveAudit, updateAudit } from "@/lib/actions/audits";
import { FieldItem } from "./FieldItem";
import { SignatureField } from "./fields/SignatureField";
import { useAutoSaveDraft, loadDraft } from "@/lib/offline/useAutoSaveDraft";
import { OfflineBanner } from "@/components/shell/OfflineBanner";

interface DraftState {
  responses: Record<string, ResponseObject>;
  notes: string;
  photos: AuditPhoto[];
  signature: string | null;
}

export interface AuditPhoto {
  id: string;
  src: string;
}

export function AuditForm({
  templateId,
  customerId,
  templateName,
  customerName,
  fields,
  auditId,
  initial,
}: {
  templateId: string;
  customerId: string;
  templateName: string;
  customerName: string;
  fields: TemplateField[];
  auditId?: string;
  initial?: {
    responses: Record<string, ResponseObject>;
    notes: string;
    photos: AuditPhoto[];
    signature: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const draftId = auditId ?? `${templateId}:${customerId}`;

  const [responses, setResponses] = useState<Record<string, ResponseObject>>(() => {
    if (initial) return initial.responses;
    const map: Record<string, ResponseObject> = {};
    for (const f of fields) {
      const r = buildResponse(f);
      if (r) map[f.id] = r as ResponseObject;
    }
    return map;
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [photos, setPhotos] = useState<AuditPhoto[]>(initial?.photos ?? []);
  const [signature, setSignature] = useState<string | null>(initial?.signature ?? null);

  // Restore a locally-saved draft after hydration (client-only: localStorage
  // isn't available during SSR, so this can't run in the useState initializer
  // without causing a hydration mismatch).
  useEffect(() => {
    if (initial) return;
    const restored = loadDraft<DraftState>(draftId);
    // A draft written by an older build could be missing a field (e.g.
    // `photos`), and setting that to `undefined` would crash `photos.map(...)`
    // below on mount — validate the shape before trusting it.
    if (
      !restored ||
      typeof restored.responses !== "object" ||
      restored.responses === null ||
      typeof restored.notes !== "string" ||
      !Array.isArray(restored.photos) ||
      (restored.signature !== null && typeof restored.signature !== "string")
    ) {
      return;
    }
    // Sync locally-saved form state (an external system) on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setResponses(restored.responses);
    setNotes(restored.notes);
    setPhotos(restored.photos);
    setSignature(restored.signature);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const { clearDraft } = useAutoSaveDraft(draftId, { responses, notes, photos, signature });

  function updateResponse(fieldId: string, response: ResponseObject) {
    setResponses((r) => ({ ...r, [fieldId]: response }));
  }

  async function handleAddPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      setPhotos((p) => [...p, { id: crypto.randomUUID(), src: url }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function missingRequiredFields(): string[] {
    return fields
      .filter((f) => f.required && !fieldAlwaysSatisfied(f.type))
      .filter((f) => !responseHasValue(responses[f.id] ?? null))
      .map((f) => f.label || "Untitled field");
  }

  function buildPayload(draft: boolean) {
    return {
      templateId,
      customerId,
      responses: fields.filter((f) => f.type !== "instruction").map((f) => responses[f.id]).filter(Boolean),
      notes,
      photos,
      signature,
      draft,
    };
  }

  function save(draft: boolean) {
    setError(null);
    if (!draft) {
      const missing = missingRequiredFields();
      if (missing.length > 0) {
        setError(`Complete required fields: ${missing.join(", ")}`);
        return;
      }
    }
    startTransition(async () => {
      try {
        const payload = buildPayload(draft);
        const result = auditId ? await updateAudit(auditId, payload) : await saveAudit(payload);
        clearDraft();
        router.push(`/audits/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save audit.");
      }
    });
  }

  return (
    <div>
      <OfflineBanner />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          {!auditId && (
            <Link
              href={`/new-audit?templateId=${templateId}&customerId=${customerId}`}
              className="btn ghost sm"
              style={{ marginBottom: 10, display: "inline-flex" }}
            >
              ← Change Selection
            </Link>
          )}
          <h1 className="disp" style={{ fontSize: 20, fontWeight: 800 }}>{templateName}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{customerName}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn ghost sm" disabled={pending} onClick={() => save(true)}>
            Save Draft
          </button>
          <button type="button" className="btn primary sm" disabled={pending} onClick={() => save(false)}>
            {pending ? "Saving…" : "Complete Audit"}
          </button>
        </div>
      </div>

      {error && (
        <div className="pill danger" style={{ marginBottom: 16, display: "block", width: "fit-content" }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        {fields.map((field) => (
          <FieldItem
            key={field.id}
            field={field}
            response={responses[field.id] ?? null}
            onChange={(r) => updateResponse(field.id, r)}
          />
        ))}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Photo Evidence</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid var(--rule)" }} />
              <button
                type="button"
                onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
                aria-label="Remove photo"
                style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "var(--pill)", color: "var(--pill-ink)", border: "none", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            handleAddPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn ghost sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Uploading…" : "+ Add photo"}
        </button>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Notes</h3>
        <textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Inspector Signature</h3>
        <SignatureField value={signature} onChange={setSignature} />
      </div>
    </div>
  );
}
