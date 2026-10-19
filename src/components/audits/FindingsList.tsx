import type { ResponseObject } from "@/lib/scoring";
import { isVideoSrc } from "@/lib/media";

function FindingValue({ r }: { r: ResponseObject }) {
  switch (r.type) {
    case "status":
      return <span className={`pill ${r.value === "pass" ? "ok" : r.value === "marginal" ? "warn" : "danger"}`}>{r.value}</span>;
    case "choice":
      return r.option ? (
        <span className={`pill ${r.option.fail ? "danger" : r.option.score !== null && r.option.score < 100 ? "warn" : "ok"}`}>{r.option.label}</span>
      ) : (
        <span style={{ color: "var(--ink-3)" }}>No answer</span>
      );
    case "checkbox":
      if (r.checked) {
        return r.checked.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.checked.map((c) => (
              <span key={c} className="pill ok" style={{ textTransform: "none", letterSpacing: 0 }}>{c}</span>
            ))}
          </div>
        ) : (
          <span style={{ color: "var(--ink-3)" }}>None selected</span>
        );
      }
      return <span>{r.value ? "Yes" : "No"}</span>;
    case "photo":
    case "annotation":
      return r.value ? (
        <div>
          {isVideoSrc(r.value) ? (
            <video src={r.value} controls playsInline preload="metadata" style={{ maxWidth: 320, borderRadius: 12, border: "1px solid var(--rule)", background: "#000" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.value} alt="" style={{ maxWidth: 220, borderRadius: 12, border: "1px solid var(--rule)" }} />
          )}
          {r.caption && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>{r.caption}</p>}
        </div>
      ) : (
        <span style={{ color: "var(--ink-3)" }}>No media</span>
      );
    case "signature":
      return r.value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.value} alt="" style={{ maxWidth: 200, background: "#fff", borderRadius: 10, border: "1px solid var(--rule)" }} />
      ) : (
        <span style={{ color: "var(--ink-3)" }}>Not signed</span>
      );
    case "slider":
      return <span className="mono">{r.value}/100</span>;
    case "number":
      return <span className="mono">{r.value || "—"}</span>;
    case "date":
      return <span>{r.value || "—"}</span>;
    case "location":
      return (
        <div>
          <span>{r.value || "—"}</span>
          {r.coords && (
            <span className="mono" style={{ marginLeft: 8, fontSize: 11.5, color: "var(--ink-2)" }}>
              {r.coords.lat.toFixed(5)}, {r.coords.lng.toFixed(5)}
            </span>
          )}
        </div>
      );
    case "text":
      return <span>{r.value || "—"}</span>;
    default:
      return null;
  }
}

export function FindingsList({ responses }: { responses: ResponseObject[] }) {
  return (
    <div>
      {responses.map((r, i) => (
        <div key={i} style={{ padding: "14px 0", borderBottom: i === responses.length - 1 ? "none" : "1px solid var(--rule)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{r.label}</div>
          <FindingValue r={r} />
        </div>
      ))}
    </div>
  );
}
