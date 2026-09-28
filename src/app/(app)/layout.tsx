import { Suspense } from "react";
import { requireUser } from "@/lib/access";
import { requests } from "@/lib/repo";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { SignOutButton } from "@/components/shell/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Two independent queries: run them together instead of one after the other.
  // requireUser() shares the memoized auth() call with the rest of the render,
  // so guarding every route in this group here costs no extra query. Several
  // routes under (app) previously relied on the proxy alone for auth.
  const [user, pendingRequests] = await Promise.all([
    requireUser(),
    requests.pendingCount().catch(() => 0),
  ]);
  const userName = user.name ?? user.email ?? "Signed in";
  const role = user.role;

  return (
    <div className="app-shell">
      <Suspense>
        <Sidebar userName={userName} role={role} pendingRequests={pendingRequests} signOutSlot={<SignOutButton />} />
      </Suspense>
      <div className="app-content">
        <TopBar />
        <main className="app-main">{children}</main>
      </div>
      <Suspense>
        <BottomTabBar role={role} pendingRequests={pendingRequests} />
      </Suspense>
    </div>
  );
}
