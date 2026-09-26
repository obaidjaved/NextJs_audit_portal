import Link from "next/link";
import { templates as templatesRepo } from "@/lib/wp/repo";

export default async function TemplatesPage() {
  const templates = (await templatesRepo.list()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div className="card panel">
      <div className="panel-top">
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Template Library</h2>
          <p className="sub" style={{ margin: 0, color: "var(--ink-2)", fontSize: 13 }}>
            TAP Services&apos; own audit templates.
          </p>
        </div>
        <Link href="/templates/new" className="btn sm">
          + New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card-soft" style={{ padding: 24, color: "var(--ink-2)", marginTop: 8 }}>
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="pick-grid" style={{ marginTop: 8, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
          {templates.map((t) => {
            const fields = Array.isArray(t.fields) ? t.fields : [];
            return (
              <Link key={t.id} href={`/templates/${t.id}`} className="pick-card" style={{ padding: 18, display: "block" }}>
                <span className="pill accent" style={{ marginBottom: 10 }}>
                  {t.category}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, marginTop: 8 }}>{t.name}</h3>
                <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                  {fields.length} field{fields.length === 1 ? "" : "s"} · updated{" "}
                  {t.updatedAt.toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
