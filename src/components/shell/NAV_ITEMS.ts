export type Role = "ADMIN" | "INSPECTOR";

export interface NavItem {
  href: string;
  label: string;
  icon: "console" | "newAudit" | "templates" | "customers" | "newCustomer" | "audits" | "actions" | "schedules" | "analytics" | "team";
  roles: Role[];
  badge?: "requests";
}

const STAFF: Role[] = ["ADMIN", "INSPECTOR"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Console", icon: "console", roles: STAFF },
  { href: "/new-audit", label: "New Audit", icon: "newAudit", roles: STAFF },
  { href: "/audits", label: "Audits", icon: "audits", roles: STAFF },
  { href: "/actions", label: "Actions", icon: "actions", roles: STAFF },
  { href: "/templates", label: "Templates", icon: "templates", roles: STAFF },
  { href: "/customers", label: "Customers", icon: "customers", roles: STAFF },
  { href: "/customers?view=requests", label: "New Customers", icon: "newCustomer", roles: STAFF, badge: "requests" },
  { href: "/schedules", label: "Schedules", icon: "schedules", roles: STAFF },
  { href: "/analytics", label: "Analytics", icon: "analytics", roles: STAFF },
  { href: "/team", label: "Team", icon: "team", roles: ["ADMIN"] },
];

// "New Customers" is a view of /customers, so the two items share a path and
// are told apart by the ?view= query.
export function isNavActive(item: NavItem, pathname: string, view: string | null): boolean {
  const [path, query] = item.href.split("?");
  const wantsRequests = query === "view=requests";
  if (path === "/") return pathname === "/";
  if (path === "/customers") {
    if (!pathname.startsWith("/customers")) return false;
    return wantsRequests ? view === "requests" : view !== "requests";
  }
  return pathname.startsWith(path);
}

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", INSPECTOR: "Inspector" };
