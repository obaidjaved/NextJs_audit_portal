import { Suspense } from "react";
import { getSession } from "@/lib/access";
import { requests } from "@/lib/repo";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { SignOutButton } from "@/components/shell/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Two independent queries: run them together instead of one after the other.
  const [session, pendingRequests] = await Promise.all([
    getSession(),
    requests.pendingCount().catch(() => 0),
  ]);
  const userName = session?.user?.name ?? session?.user?.email ?? "Signed in";
  const role = session?.user?.role ?? "INSPECTOR";

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
