import type { ReactNode } from "react";

// A titled block of the Console, so the page reads as clear sections (Revenue, Overview, ...).
export function ConsoleSection({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="console-section" aria-label={title}>
      <div className="console-section-head">
        <h2 className="console-section-title">{title}</h2>
        {sub && <span className="console-section-sub">{sub}</span>}
      </div>
      {children}
    </section>
  );
}
