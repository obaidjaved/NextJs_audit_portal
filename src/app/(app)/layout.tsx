import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { requests } from "@/lib/wp/repo";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { SignOutButton } from "@/components/shell/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "Signed in";
  const role = session?.user?.role ?? "INSPECTOR";
  // The badge is a nicety: if WordPress is briefly unreachable, still render the shell.
  const pendingRequests = await requests.pendingCount().catch(() => 0);

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
