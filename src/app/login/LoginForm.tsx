"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [state, formAction, pending] = useActionState(loginAction, { error: null });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <form action={formAction} className="login-form" data-pending={pending || undefined}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <label className="login-field rise" style={{ ["--d" as string]: "0.38s" }}>
        <span>Email or username</span>
        <span className="login-input">
          <svg {...icon} className="lead">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
          </svg>
          {/* type="text", not "email": the WordPress backend accepts a
              username too, and a native type="email" input's browser-level
              validation would silently block that before the form ever submits. */}
          <input
            name="email"
            type="text"
            autoComplete="username"
            placeholder="you@company.com"
            // A wrong password must not also clear the email the person just typed.
            defaultValue={state.email ?? ""}
            required
          />
        </span>
      </label>

      <label className="login-field rise" style={{ ["--d" as string]: "0.46s" }}>
        <span>Password</span>
        <span className="login-input">
          <svg {...icon} className="lead">
            <rect x="4" y="11" width="16" height="10" rx="3" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
            onBlur={() => setCapsLock(false)}
            required
          />
          <button
            type="button"
            className="login-eye"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg {...icon}>
                <path d="M3 3l18 18" />
                <path d="M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12 12 0 0 1-2.6 3.3M6.4 7.6A12.4 12.4 0 0 0 2.5 12c1 2 4.5 6 9.5 6 1.5 0 2.8-.3 4-.9" />
                <path d="M9.9 10a3 3 0 0 0 4.1 4.1" />
              </svg>
            ) : (
              <svg {...icon}>
                <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </span>
        {capsLock && (
          <span className="login-hint" role="status">
            Caps Lock is on
          </span>
        )}
      </label>

      {state.error && (
        <p className="login-error" role="alert" key={state.error}>
          <svg {...icon} width={16} height={16}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.2v.1" />
          </svg>
          {state.error}
        </p>
      )}

      <button className="login-submit rise" style={{ ["--d" as string]: "0.54s" }} type="submit" disabled={pending}>
        <span className="login-submit-label">{pending ? "Signing in" : "Sign in"}</span>
        {pending ? (
          <span className="login-spinner" aria-hidden="true" />
        ) : (
          <svg {...icon} className="login-arrow">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>

      <p className="login-foot rise" style={{ ["--d" as string]: "0.62s" }}>
        Forgot your password? Ask a TAP administrator to reset it.
      </p>
    </form>
  );
}
