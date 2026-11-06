"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { logAdminAction } from "@/lib/admin-log";
import { users, RepoError } from "@/lib/repo";
import { createUserSchema } from "@/lib/validation/user";
import { parseOrThrow } from "@/lib/validation/parse";
import { passwordProblem } from "@/lib/validation/password";
import { attempt } from "./result";

export async function createUser(input: unknown) {
  return attempt(async () => {
    const admin = await requireAdmin();
    const data = parseOrThrow(createUserSchema, input);
    try {
      await users.create(data);
    } catch (err) {
      if (err instanceof RepoError && err.status === 409) throw new Error("A user with that email already exists.");
      throw err;
    }
    logAdminAction(admin, "user.create", { email: data.email, role: data.role });
    revalidatePath("/team");
  });
}

export async function setUserActive(id: string, active: boolean) {
  return attempt(async () => {
    const admin = await requireAdmin();
    if (id === admin.id) throw new Error("You can't deactivate your own account.");
    await users.patch(id, { active });
    logAdminAction(admin, active ? "user.activate" : "user.deactivate", { userId: id });
    revalidatePath("/team");
  });
}

export async function setUserRole(id: string, role: "ADMIN" | "INSPECTOR") {
  return attempt(async () => {
    const admin = await requireAdmin();
    if (id === admin.id) throw new Error("You can't change your own role.");
    await users.patch(id, { role });
    logAdminAction(admin, "user.role", { userId: id, role });
    revalidatePath("/team");
  });
}

export async function resetUserPassword(id: string, password: string) {
  return attempt(async () => {
    const admin = await requireAdmin();
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);
    await users.patch(id, { password });
    logAdminAction(admin, "user.password-reset", { userId: id });
    revalidatePath("/team");
  });
}
