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
  { href: "/new-audit", label: "New Audits", icon: "newAudit", roles: STAFF },
  { href: "/audits", label: "Audits", icon: "audits", roles: STAFF },
  { href: "/actions", label: "Actions", icon: "actions", roles: ["ADMIN"] },
  { href: "/templates", label: "Templates", icon: "templates", roles: STAFF },
  // Leads = everything from the public quote form, plus leads added by hand.
  // The badge counts leads still waiting for a decision.
  { href: "/leads", label: "Leads", icon: "newCustomer", roles: ["ADMIN"], badge: "requests" },
  { href: "/customers", label: "Customers", icon: "customers", roles: ["ADMIN"] },
  { href: "/schedules", label: "Schedules", icon: "schedules", roles: STAFF },
  { href: "/analytics", label: "Analytics", icon: "analytics", roles: ["ADMIN"] },
  { href: "/team", label: "Team", icon: "team", roles: ["ADMIN"] },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname.startsWith(item.href);
}

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", INSPECTOR: "Inspector" };
