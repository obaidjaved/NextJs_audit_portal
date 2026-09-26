"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavActive, navFor, ROLE_LABEL, type Role } from "./NAV_ITEMS";
import { NavIcons } from "./navIcons";
import { ThemeToggle } from "./ThemeToggle";
import { initials } from "@/lib/initials";
import type { ReactNode } from "react";

export function Sidebar({
  userName,
  role,
  pendingRequests,
  signOutSlot,
}: {
  userName: string;
  role: Role;
  pendingRequests: number;
  signOutSlot: ReactNode;
}) {
  const pathname = usePathname();
  const view = useSearchParams().get("view");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-name">TAP Ops Console</span>
      </div>

      <nav className="sidebar-nav">
        {navFor(role).map((item) => {
          const active = isNavActive(item, pathname, view);
          return (
            <Link key={item.href} href={item.href} data-active={active}>
              {NavIcons[item.icon as keyof typeof NavIcons]}
              {item.label}
              {item.badge === "requests" && pendingRequests > 0 && <span className="nav-badge">{pendingRequests}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-foot-user">
          <div className="avatar-pill">{initials(userName)}</div>
          <div>
            <div className="u-name">{userName}</div>
            <div className="u-role">{ROLE_LABEL[role]}</div>
          </div>
        </div>
        <div className="sidebar-foot-actions">
          {signOutSlot}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
