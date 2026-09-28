import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // The proxy only checks the cookie's signature, so it cannot tell an active
  // user from a deactivated one and must not bounce people off this page — that
  // would loop. Here auth() can reach the database: an active session goes back
  // to the app, an inactive or missing one renders the form.
  const session = await getSession();
  if (session?.user?.id) redirect("/");

  return (
    <div className="login-wrap">
      <div className="login-card card">
        <div className="login-brand">
          <span className="disp login-title">TAP Ops Console</span>
          <span className="login-sub">Sign in to continue</span>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
