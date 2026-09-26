import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
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
