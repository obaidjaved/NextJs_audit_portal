"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { requests } from "@/lib/wp/repo";
import { WpError } from "@/lib/wp/client";

// New-customer requests arrive from the tapsvs.com Gravity Form (handled by the
// WordPress plugin). Here an admin approves them into real customers or rejects them.

function friendly(err: unknown): never {
  if (err instanceof WpError && (err.status === 409 || err.status === 404)) {
    throw new Error("This request was already reviewed or no longer exists.");
  }
  throw err;
}

export async function approveQuoteRequest(id: string) {
  await requireAdmin();
  try {
    const { customerId } = await requests.approve(id);
    revalidatePath("/customers");
    return { customerId };
  } catch (err) {
    friendly(err);
  }
}

export async function rejectQuoteRequest(id: string, note?: string) {
  await requireAdmin();
  try {
    await requests.reject(id, note?.trim().slice(0, 500) || undefined);
  } catch (err) {
    friendly(err);
  }
  revalidatePath("/customers");
}
