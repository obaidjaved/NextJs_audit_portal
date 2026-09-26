"use client";

import { useState } from "react";

export function ScoreRing({ week, allTime }: { week: number; allTime: number }) {
  const [scope, setScope] = useState<"week" | "all">("week");
  // Clamp to 0-100: nothing upstream enforces the option-score input's
  // min/max hint against typed or pasted values, so an out-of-range score
  // could otherwise produce a negative dash-array segment and a ">100%" label.
  const avg = Math.min(100, Math.max(0, scope === "week" ? week : allTime));

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const len = (avg / 100) * circumference;
  const color = avg >= 90 ? "var(--ok)" : avg >= 70 ? "var(--warn)" : "var(--danger)";

  return (
    <div className="card panel" style={{ textAlign: "center" }}>
      <div className="panel-top" style={{ textAlign: "left" }}>
        <h3>Score Ring</h3>
      </div>

      <div className="ring-wrap">
        <svg viewBox="0 0 150 150">
          <circle cx={75} cy={75} r={radius} fill="none" stroke="var(--rule)" strokeWidth={14} />
          <circle
            cx={75}
            cy={75}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${len.toFixed(2)} ${(circumference - len).toFixed(2)}`}
          />
        </svg>
        <div className="ring-center">
          <div className="n mono">{avg}%</div>
          <div className="k">avg score</div>
        </div>
      </div>

      <div className="seg-toggle">
        <button type="button" className={scope === "week" ? "active" : ""} onClick={() => setScope("week")}>
          This Week
        </button>
        <button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
          All Time
        </button>
      </div>
    </div>
  );
}
