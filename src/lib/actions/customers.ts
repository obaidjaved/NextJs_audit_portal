"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { customers, RepoError } from "@/lib/repo";
import { customerSchema } from "@/lib/validation/customer";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt } from "./result";

export async function createCustomer(input: unknown) {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(customerSchema, input);
    const customer = await customers.create(data);
    revalidatePath("/customers");
    return { id: customer.id };
  });
}

export async function updateCustomer(id: string, input: unknown) {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(customerSchema, input);
    await customers.update(id, data);
    revalidatePath("/customers");
    return { id };
  });
}

export async function deleteCustomer(id: string) {
  return attempt(async () => {
    await requireAdmin();
    try {
      await customers.remove(id);
    } catch (err) {
      if (err instanceof RepoError && err.status === 409) {
        throw new Error("Can't delete — this customer has audits or schedules using it.");
      }
      throw err;
    }
    revalidatePath("/customers");
  });
}
