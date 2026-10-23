"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/access";
import { customers, requests } from "@/lib/repo";
import { LEAD_STATUSES, PAYMENT_STATUSES, PROGRESS_STATUSES } from "@/lib/ops-options";
import { ALL_SERVICES } from "@/lib/quote-options";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt, type ActionResult } from "./result";

const services = z.array(z.enum(ALL_SERVICES as [string, ...string[]]));

const money = z.number().min(0, "Must be 0 or more").max(999_999_999).nullable();

// Payment proof files: an https link (Blob storage), an uploaded file path (/uploads/…), or inline image/PDF data.
const isProofRef = (s: string) => /^(https:\/\/|\/uploads\/|data:image\/|data:application\/pdf)/.test(s);

const leadPatchSchema = z
  .object({
    services: services.min(1, "Choose at least one service"),
    paymentProofs: z.array(z.string().max(3_000_000).refine(isProofRef, "Not a valid file")).max(10, "Up to 10 files"),
    leadStatus: z.enum(LEAD_STATUSES),
    paymentStatus: z.enum(PAYMENT_STATUSES),
    budgetQuote: money,
    amountPaid: z.number().min(0, "Must be 0 or more").max(999_999_999),
    dateNeeded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  })
  .partial()
  .strict();

// Staff edit a lead from the Leads dashboard. "Converted" isn't set here: it
// happens when an admin converts the lead (which needs a payment proof) and
// creates the customer.
export async function updateLead(id: string, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    await requireStaff();
    const patch = parseOrThrow(leadPatchSchema, input);
    if (patch.leadStatus === "Converted") throw new Error("Use Convert on the lead's details to turn it into a customer.");
    await requests.update(id, patch);
    revalidatePath("/leads");
  });
}

const customerOpsSchema = z
  .object({
    services,
    paymentStatus: z.enum(PAYMENT_STATUSES),
    progressStatus: z.enum(PROGRESS_STATUSES),
    projectValue: money,
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").nullable(),
    assignedAuditorId: z.string().min(1).nullable(),
  })
  .partial()
  .strict();

export async function updateCustomerOps(id: string, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    const patch = parseOrThrow(customerOpsSchema, input);
    // Handing a customer to an auditor is an administrator's call.
    if (patch.assignedAuditorId !== undefined) await requireAdmin();
    else await requireStaff();
    await customers.update(id, patch as never);
    revalidatePath("/customers");
  });
}
