"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="login-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <label className="login-field">
        <span>Email</span>
        <input className="input" name="email" type="email" autoComplete="username" required />
      </label>

      <label className="login-field">
        <span>Password</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </label>

      {state.error && <p className="login-error">{state.error}</p>}

      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
