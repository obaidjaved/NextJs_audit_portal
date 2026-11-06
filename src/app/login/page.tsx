import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/access";
import { LoginForm } from "./LoginForm";
import { LoginHero } from "./LoginHero";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  // The proxy only checks the cookie's signature, so it cannot tell an active
  // user from a deactivated one and must not bounce people off this page — that
  // would loop. Here auth() can reach the database: an active session goes back
  // to the app, an inactive or missing one renders the form.
  const session = await getSession();
  if (session?.user?.id) redirect("/");

  return (
    <main className="login-page">
      <LoginHero />
      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <span className="login-kicker rise" style={{ ["--d" as string]: "0.15s" }}>
              TAP Ops Console
            </span>
            <h1 className="disp login-title rise" style={{ ["--d" as string]: "0.22s" }}>
              Welcome back
            </h1>
            <p className="login-sub rise" style={{ ["--d" as string]: "0.3s" }}>
              Sign in to continue to your audits.
            </p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
