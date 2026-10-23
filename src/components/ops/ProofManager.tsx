"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";
import { unwrap } from "@/lib/actions/result";

const isPdf = (u: string) => u.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(u);

// Browsers block opening data: URLs directly, so turn those into a temporary blob URL first.
export async function openProof(url: string) {
  if (url.startsWith("data:")) {
    const blob = await (await fetch(url)).blob();
    window.open(URL.createObjectURL(blob), "_blank");
  } else {
    window.open(url, "_blank", "noopener");
  }
}

// Payment proof: transfer screenshots and invoices attached to a lead (kept on the customer after conversion).
export function ProofManager({
  proofs,
  onSave,
  readOnly,
}: {
  proofs: string[];
  onSave?: (proofs: string[]) => Promise<unknown>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string[]) {
    if (!onSave) return;
    startTransition(async () => {
      try {
        unwrap(await onSave(next));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  async function add(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      save([...proofs, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {proofs.length === 0 ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>No payment proof attached yet.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {proofs.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => openProof(p)}
                aria-label={`Open payment proof ${i + 1}`}
                style={{ width: 84, height: 84, borderRadius: 12, border: "1px solid var(--rule)", background: "var(--card-soft)", cursor: "pointer", overflow: "hidden", padding: 0, fontWeight: 800, fontSize: 12, color: "var(--ink-2)" }}
              >
                {isPdf(p) ? (
                  "PDF"
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </button>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remove payment proof ${i + 1}`}
                  disabled={pending}
                  onClick={() => confirm("Remove this payment proof?") && save(proofs.filter((_, j) => j !== i))}
                  style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "var(--pill)", color: "var(--pill-ink)", border: "none", cursor: "pointer" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div style={{ marginTop: 10 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              add(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn ghost sm" disabled={uploading || pending} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : pending ? "Saving…" : "+ Add payment proof"}
          </button>
          <span style={{ fontSize: 12, color: "var(--ink-2)", marginLeft: 8 }}>Transfer screenshot or invoice (image or PDF)</span>
        </div>
      )}
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
