import { signOut } from "@/lib/auth";
import { NavIcons } from "./navIcons";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="icon-pill" type="submit" aria-label="Sign out" title="Sign out">
        {NavIcons.signOut}
      </button>
    </form>
  );
}
