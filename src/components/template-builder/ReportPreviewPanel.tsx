"use client";

import type { TemplateField } from "@/lib/field-types";
import { accentForTheme } from "@/lib/color";

const DEFAULT_ACCENT = "#FF7A1A";
const isHex = (v: string | null): v is string => !!v && /^#[0-9a-fA-F]{6}$/.test(v);

// Sample answer shown for each field type so the report layout reads realistically.
function sampleValue(field: TemplateField): { text: string; tone: "ok" | "warn" | "danger" | "plain" } {
  switch (field.type) {
    case "status":
      return { text: "Pass", tone: "ok" };
    case "choice": {
      const opt = field.options?.[0];
      return { text: opt?.label ?? "Option", tone: opt?.fail ? "danger" : "ok" };
    }
    case "checkbox":
      return { text: "Yes", tone: "plain" };
    case "photo":
    case "annotation":
      return { text: "Photo attached", tone: "plain" };
    case "signature":
      return { text: "Signed", tone: "plain" };
    case "slider":
      return { text: "80/100", tone: "plain" };
    case "number":
      return { text: "42", tone: "plain" };
    case "date":
      return { text: "Sep 24, 2026", tone: "plain" };
    case "location":
      return { text: "Building B, Austin, TX", tone: "plain" };
    default:
      return { text: "Sample response text", tone: "plain" };
  }
}

const TONE: Record<string, { bg: string; fg: string }> = {
  ok: { bg: "#DEF3E6", fg: "#1E8E5A" },
  warn: { bg: "#FBEFCF", fg: "#B9790C" },
  danger: { bg: "#FBE3DF", fg: "#D6483A" },
  plain: { bg: "transparent", fg: "#17161B" },
};

export function ReportPreviewPanel({
  templateName,
  fields,
  style,
  accentColor,
  logo,
}: {
  templateName: string;
  fields: TemplateField[];
  style: "MODERN" | "CLASSIC";
  accentColor: string | null;
  logo: string | null;
}) {
  // The report prints on white paper, independent of the app theme.
  const accent = accentForTheme(isHex(accentColor) ? accentColor : DEFAULT_ACCENT, "#FFFFFF");
  const rows = fields.filter((f) => f.type !== "instruction");
  const classic = style === "CLASSIC";
  const title = templateName || "Untitled Template";

  const paper: React.CSSProperties = {
    background: "#FFFFFF",
    color: "#17161B",
    borderRadius: classic ? 4 : 14,
    border: classic ? "1px solid #C9C4B4" : "1px solid #ECE4CB",
    boxShadow: "0 10px 30px -18px rgba(40,30,10,.35)",
    fontFamily: classic ? "Georgia, 'Times New Roman', serif" : "var(--font-body)",
    overflow: "hidden",
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Report Preview · {classic ? "Classic" : "Modern"}
      </div>

      <div style={paper}>
        {classic ? (
          <div style={{ padding: "22px 22px 14px", textAlign: "center", borderBottom: `3px double ${accent}` }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo" style={{ height: 40, maxWidth: "60%", objectFit: "contain", marginBottom: 8 }} />
            )}
            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#716F63" }}>Inspection Report</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#716F63", marginTop: 6 }}>EL-0001 · Sample Customer · Sep 24, 2026</div>
          </div>
        ) : (
          <div style={{ background: accent, color: "#FFFFFF", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.85, fontWeight: 700 }}>Inspection Report</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, marginTop: 2, overflowWrap: "anywhere" }}>{title}</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>EL-0001 · Sample Customer · Sep 24, 2026</div>
            </div>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo" style={{ height: 40, maxWidth: 110, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4, flex: "none" }} />
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid #ECE4CB" }}>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: "#716F63", fontWeight: 700 }}>Overall score</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1.1 }}>92</div>
          </div>
          <span style={{ background: "#DEF3E6", color: "#1E8E5A", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, textTransform: "uppercase" }}>Cleared</span>
        </div>

        <div style={{ padding: "6px 22px 4px" }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: accent, fontWeight: 700, margin: "10px 0 4px" }}>Findings</div>
          {rows.length === 0 ? (
            <p style={{ fontSize: 13, color: "#716F63", padding: "8px 0" }}>Add a field to see it in the report.</p>
          ) : (
            rows.map((f, i) => {
              const v = sampleValue(f);
              const tone = TONE[v.tone];
              return (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom: i === rows.length - 1 ? "none" : classic ? "1px solid #C9C4B4" : "1px solid #ECE4CB",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: classic ? 600 : 700, minWidth: 0, overflowWrap: "anywhere" }}>{f.label || "Untitled field"}</span>
                  <span
                    style={{
                      flex: "none",
                      background: tone.bg,
                      color: tone.fg,
                      padding: v.tone === "plain" ? 0 : "3px 10px",
                      borderRadius: classic ? 2 : 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {v.text}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "14px 22px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, borderTop: `1px solid ${classic ? "#C9C4B4" : "#ECE4CB"}`, marginTop: 8 }}>
          <div>
            <div style={{ width: 120, borderBottom: "1px solid #17161B", height: 22 }} />
            <div style={{ fontSize: 10.5, color: "#716F63", marginTop: 4 }}>Inspector signature</div>
          </div>
          <div style={{ fontSize: 10.5, color: "#716F63" }}>Page 1 of 1</div>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10 }}>
        Sample data shown. Style, accent color and logo update as you edit.
      </p>
    </div>
  );
}
