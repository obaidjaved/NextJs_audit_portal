import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  return (
    <header className="topbar card">
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--accent-ink)" }}>
        TAP Services
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <SignOutButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
