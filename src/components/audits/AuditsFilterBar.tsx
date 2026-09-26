"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuditStatus } from "@/lib/scoring";

const STATUSES: (AuditStatus | "All")[] = ["All", "In Progress", "Pending Approval", "Flagged", "Marginal", "Cleared"];

export function AuditsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "All";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/audits?${params.toString()}`);
  }

  function updateSearchDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 300);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}>
      <div className="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input placeholder="Search audits, customers, doc #…" defaultValue={q} onChange={(e) => updateSearchDebounced(e.target.value)} />
      </div>
      <div className="filter-row" style={{ marginBottom: 16 }}>
        {STATUSES.map((s) => (
          <button key={s} type="button" className={status === s ? "active" : ""} onClick={() => updateParam("status", s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
