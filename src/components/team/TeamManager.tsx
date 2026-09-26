"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, resetUserPassword, setUserActive, setUserRole } from "@/lib/actions/users";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "INSPECTOR";
  active: boolean;
  auditCount: number;
}

const FIELD = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" } as const;
const ROLE_PILL = { ADMIN: "accent", INSPECTOR: "pending" } as const;

export function TeamManager({ users, currentUserId }: { users: TeamUser[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "INSPECTOR" as TeamUser["role"] });

  function run(fn: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        after?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function create() {
    run(
      () => createUser(form),
      () => {
        setForm({ name: "", email: "", password: "", role: "INSPECTOR" });
        setShowForm(false);
      },
    );
  }

  function resetPassword(u: TeamUser) {
    const password = prompt(`New password for ${u.name} (min 8 characters):`);
    if (password) run(() => resetUserPassword(u.id, password));
  }

  return (
    <div>
      {error && <div className="pill danger" style={{ marginBottom: 12, whiteSpace: "normal" }}>{error}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        {users.map((u, i) => {
          const isSelf = u.id === currentUserId;
          return (
            <div
              key={u.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 18px",
                borderBottom: i === users.length - 1 ? "none" : "1px solid var(--rule)",
                opacity: u.active ? 1 : 0.55,
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                  <span className={`pill ${ROLE_PILL[u.role]}`}>{u.role}</span>
                  {!u.active && <span className="pill warn">Deactivated</span>}
                  {isSelf && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>you</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.email} · {u.auditCount} audit{u.auditCount === 1 ? "" : "s"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                    className="select"
                    aria-label={`Role for ${u.name}`}
                    value={u.role}
                    disabled={pending || isSelf}
                    onChange={(e) => run(() => setUserRole(u.id, e.target.value as "ADMIN" | "INSPECTOR"))}
                    style={{ height: 34, fontSize: 12.5, padding: "0 10px", width: "auto" }}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="INSPECTOR">Inspector</option>
                </select>
                <button type="button" className="btn ghost sm" disabled={pending} onClick={() => resetPassword(u)}>
                  Reset password
                </button>
                {!isSelf && (
                  <button type="button" className="btn ghost sm" disabled={pending} onClick={() => run(() => setUserActive(u.id, !u.active))}>
                    {u.active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        {!showForm ? (
          <button type="button" className="btn primary sm" onClick={() => setShowForm(true)}>+ Add user</button>
        ) : (
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
            <label style={FIELD}>
              Name
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label style={FIELD}>
              Email
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label style={FIELD}>
              Temporary password
              <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </label>
            <label style={FIELD}>
              Role
              <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as TeamUser["role"] }))}>
                <option value="INSPECTOR">Inspector — runs audits and manages actions</option>
                <option value="ADMIN">Admin — full access incl. approvals and team</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn primary sm" disabled={pending || !form.name || !form.email || form.password.length < 8} onClick={create}>
                {pending ? "Creating…" : "Create user"}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
