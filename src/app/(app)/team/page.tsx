import { users as usersRepo } from "@/lib/wp/repo";
import { requireAdminPage } from "@/lib/access";
import { TeamManager } from "@/components/team/TeamManager";

export default async function TeamPage() {
  const admin = await requireAdminPage();

  const users = (await usersRepo.list()).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Team &amp; Access</h1>
      <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16 }}>
        Admins manage everything, including approvals and this team. Inspectors run audits and manage actions.
      </p>
      <TeamManager
        currentUserId={admin.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          auditCount: u.auditCount,
        }))}
      />
    </div>
  );
}
