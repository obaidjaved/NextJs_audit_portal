"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavActive, navFor, type Role } from "./NAV_ITEMS";
import { NavIcons } from "./navIcons";

export function BottomTabBar({ role, pendingRequests }: { role: Role; pendingRequests: number }) {
  const pathname = usePathname();
  const view = useSearchParams().get("view");

  return (
    <nav className="bottom-tabs">
      {navFor(role).map((item) => {
        const active = isNavActive(item, pathname, view);
        return (
          <Link key={item.href} href={item.href} className="bottom-tab" data-active={active}>
            {NavIcons[item.icon as keyof typeof NavIcons]}
            {item.label}
            {item.badge === "requests" && pendingRequests > 0 && <span className="nav-badge nav-badge-dot">{pendingRequests}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
