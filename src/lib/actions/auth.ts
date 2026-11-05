"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error: string | null; email?: string },
  formData: FormData,
): Promise<{ error: string | null; email?: string }> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      // The email comes back so the form can keep it (React clears the fields after a submit); the password never does.
      return { error: "Invalid email or password.", email: typeof email === "string" ? email : "" };
    }
    throw err;
  }
}
