"use client";

import { useRef, useState } from "react";
import { accentForTheme } from "@/lib/color";
import { uploadFile } from "@/lib/upload";

export function ReportStyleEditor({
  reportStyle,
  reportAccentColor,
  reportLogo,
  onChange,
}: {
  reportStyle: "MODERN" | "CLASSIC";
  reportAccentColor: string | null;
  reportLogo: string | null;
  onChange: (patch: { reportStyle?: "MODERN" | "CLASSIC"; reportAccentColor?: string | null; reportLogo?: string | null }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const DEFAULT_ACCENT = "#FF7A1A";
  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  // The text field commits on every keystroke, so a half-typed value (e.g.
  // "#FF") would otherwise reach accentForTheme/relLum mid-edit and produce
  // NaN cascading into a garbage "#NaNNaNNaN" color — and that garbage could
  // get persisted to the template. Track the typed text separately and only
  // propagate/derive from it once it's a complete, valid hex.
  const [textDraft, setTextDraft] = useState(reportAccentColor ?? DEFAULT_ACCENT);
  const rawAccent = isValidHex(reportAccentColor ?? "") ? (reportAccentColor as string) : DEFAULT_ACCENT;
  const safeAccent = accentForTheme(rawAccent, "#FFFFFF");
  const wasAdjusted = safeAccent.toLowerCase() !== rawAccent.toLowerCase();

  function handleTextChange(value: string) {
    setTextDraft(value);
    if (isValidHex(value)) onChange({ reportAccentColor: value });
  }

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setLogoError(null);
    try {
      const url = await uploadFile(file);
      onChange({ reportLogo: url });
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
          Report style
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {(["MODERN", "CLASSIC"] as const).map((style) => (
            <button
              key={style}
              type="button"
              className="pick-card"
              data-selected={reportStyle === style}
              onClick={() => onChange({ reportStyle: style })}
              style={{ padding: "14px 20px", fontWeight: 700, fontSize: 13.5 }}
            >
              {style === "MODERN" ? "Modern" : "Classic"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
          Accent color
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="color"
            value={rawAccent}
            onChange={(e) => {
              setTextDraft(e.target.value);
              onChange({ reportAccentColor: e.target.value });
            }}
            style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--rule-2)", padding: 2, cursor: "pointer" }}
          />
          <input
            className="input"
            value={textDraft}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ width: 120 }}
          />
          <span
            className="pill"
            style={{ background: safeAccent, color: "#fff" }}
          >
            Sample text
          </span>
        </div>
        {!isValidHex(textDraft) && (
          <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>
            Enter a valid hex color (e.g. #FF7A1A).
          </p>
        )}
        {isValidHex(textDraft) && wasAdjusted && (
          <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 8 }}>
            Adjusted to {safeAccent} to keep report text readable (≥4.5:1 contrast).
          </p>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
          Report logo
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {reportLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reportLogo} alt="Logo" style={{ height: 44, borderRadius: 10, background: "#fff", padding: 4, border: "1px solid var(--rule)" }} />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleLogo(e.target.files?.[0])}
          />
          <button type="button" className="btn ghost sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : reportLogo ? "Replace logo" : "Upload logo"}
          </button>
          {reportLogo && (
            <button type="button" className="btn ghost sm" onClick={() => onChange({ reportLogo: null })}>
              Remove
            </button>
          )}
        </div>
        {logoError && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{logoError}</p>}
      </div>
    </div>
  );
}
