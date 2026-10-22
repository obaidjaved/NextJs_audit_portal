"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/access";
import { customers, requests } from "@/lib/repo";
import { LEAD_STATUSES, PAYMENT_STATUSES, PROGRESS_STATUSES } from "@/lib/ops-options";
import { parseOrThrow } from "@/lib/validation/parse";

const money = z.number().min(0, "Must be 0 or more").max(999_999_999).nullable();

const leadPatchSchema = z
  .object({
    leadStatus: z.enum(LEAD_STATUSES),
    paymentStatus: z.enum(PAYMENT_STATUSES),
    budgetQuote: money,
    amountPaid: z.number().min(0, "Must be 0 or more").max(999_999_999),
    dateNeeded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  })
  .partial()
  .strict();

// Staff edit a lead from the Leads dashboard. "Converted" isn't set here: it
// happens when an admin approves the lead, which also creates the customer.
export async function updateLead(id: string, input: unknown) {
  await requireStaff();
  const patch = parseOrThrow(leadPatchSchema, input);
  if (patch.leadStatus === "Converted") throw new Error("Approve the lead to convert it into a customer.");
  await requests.update(id, patch);
  revalidatePath("/leads");
}

const customerOpsSchema = z
  .object({
    paymentStatus: z.enum(PAYMENT_STATUSES),
    progressStatus: z.enum(PROGRESS_STATUSES),
    projectValue: money,
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").nullable(),
    assignedAuditorId: z.string().min(1).nullable(),
  })
  .partial()
  .strict();

export async function updateCustomerOps(id: string, input: unknown) {
  const patch = parseOrThrow(customerOpsSchema, input);
  // Handing a customer to an auditor is an administrator's call.
  if (patch.assignedAuditorId !== undefined) await requireAdmin();
  else await requireStaff();
  await customers.update(id, patch as never);
  revalidatePath("/customers");
}
