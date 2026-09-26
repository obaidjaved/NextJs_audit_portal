"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/access";
import { customers } from "@/lib/wp/repo";
import { WpError } from "@/lib/wp/client";
import { customerSchema } from "@/lib/validation/customer";
import { parseOrThrow } from "@/lib/validation/parse";

export async function createCustomer(input: unknown) {
  await requireStaff();
  const data = parseOrThrow(customerSchema, input);
  const customer = await customers.create(data);
  revalidatePath("/customers");
  return { id: customer.id };
}

export async function updateCustomer(id: string, input: unknown) {
  await requireStaff();
  const data = parseOrThrow(customerSchema, input);
  await customers.update(id, data);
  revalidatePath("/customers");
  return { id };
}

export async function deleteCustomer(id: string) {
  await requireStaff();
  try {
    await customers.remove(id);
  } catch (err) {
    if (err instanceof WpError && err.status === 409) {
      throw new Error("Can't delete — this customer has audits or schedules using it.");
    }
    throw err;
  }
  revalidatePath("/customers");
}
