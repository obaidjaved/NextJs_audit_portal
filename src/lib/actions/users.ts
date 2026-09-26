"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { users } from "@/lib/wp/repo";
import { WpError } from "@/lib/wp/client";
import { createUserSchema } from "@/lib/validation/user";
import { parseOrThrow } from "@/lib/validation/parse";

// Accounts live in WordPress; WordPress enforces uniqueness and self-protection too.
export async function createUser(input: unknown) {
  await requireAdmin();
  const data = parseOrThrow(createUserSchema, input);
  try {
    await users.create(data);
  } catch (err) {
    if (err instanceof WpError && err.status === 409) throw new Error("A user with that email already exists.");
    throw err;
  }
  revalidatePath("/team");
}

export async function setUserActive(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (id === admin.id) throw new Error("You can't deactivate your own account.");
  await users.patch(id, { active });
  revalidatePath("/team");
}

export async function setUserRole(id: string, role: "ADMIN" | "INSPECTOR") {
  const admin = await requireAdmin();
  if (id === admin.id) throw new Error("You can't change your own role.");
  await users.patch(id, { role });
  revalidatePath("/team");
}

export async function resetUserPassword(id: string, password: string) {
  await requireAdmin();
  if (typeof password !== "string" || password.length < 8) throw new Error("Password must be at least 8 characters.");
  await users.patch(id, { password });
  revalidatePath("/team");
}
