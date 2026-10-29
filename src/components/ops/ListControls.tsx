"use client";

import { useMemo, useState, type ReactNode } from "react";

export const PAGE_SIZE = 20;

// Client-side paging: 20 rows a page. `resetKey` changes whenever a search or filter changes, which sends you back to page 1.
export function usePaged<T>(items: T[], resetKey: string, pageSize = PAGE_SIZE) {
  // The page belongs to one search/filter combination; a different one starts again at page 1.
  const [state, setState] = useState({ page: 1, key: resetKey });
  const page = state.key === resetKey ? state.page : 1;
  const setPage = (p: number) => setState({ page: p, key: resetKey });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  return { page: current, setPage, totalPages, pageItems, total: items.length, from: items.length === 0 ? 0 : (current - 1) * pageSize + 1, to: Math.min(current * pageSize, items.length) };
}

// Search box + filter dropdowns, laid out like the students panel.
export function FilterBar({
  search,
  onSearch,
  placeholder,
  filters,
  onClear,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  onClear?: () => void;
  placeholder: string;
  filters: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }[];
  children?: ReactNode;
}) {
  return (
    <div className="lc-bar">
      <div className="search-box lc-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} aria-label="Search" />
      </div>
      {filters.map((f) => (
        <label key={f.label} className="lc-filter">
          <span>{f.label}</span>
          <select className="select" value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            {f.options.map((o) => {
              const opt = typeof o === "string" ? { value: o, label: o } : o;
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
          </select>
        </label>
      ))}
      {onClear && (search.trim() !== "" || filters.some((f) => f.value !== (typeof f.options[0] === "string" ? f.options[0] : f.options[0].value))) && (
        <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-end", height: 42 }} onClick={onClear}>
          Clear filters
        </button>
      )}
      {children}
    </div>
  );
}

// "Showing 1–20 of 57"  ← Prev  1 2 3 …  Next →
export function Pagination({ page, totalPages, total, from, to, onPage }: { page: number; totalPages: number; total: number; from: number; to: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }
  return (
    <div className="lc-pager">
      <span className="lc-count">
        Showing {from}–{to} of {total}
      </span>
      {totalPages > 1 && (
        <nav className="lc-pages" aria-label="Pagination">
          <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>
            ← Prev
          </button>
          {pages.map((p, i) =>
            p === "gap" ? (
              <span key={`g${i}`} aria-hidden="true">…</span>
            ) : (
              <button key={p} type="button" className={p === page ? "active" : ""} aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}>
                {p}
              </button>
            ),
          )}
          <button type="button" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
