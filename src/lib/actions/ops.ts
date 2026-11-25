"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { emailTeamMember } from "@/lib/notify";
import { customers, requests, RepoError, type CustomerInput } from "@/lib/repo";
import { LEAD_STATUSES } from "@/lib/ops-options";
import { ALL_SERVICES } from "@/lib/quote-options";
import { parseOrThrow } from "@/lib/validation/parse";
import { allProofs, makePayment, paymentDetailsSchema, sumPayments } from "@/lib/payments";
import { leadSchema } from "@/lib/validation/quote-request";
import { attempt, type ActionResult } from "./result";

const services = z.array(z.enum(ALL_SERVICES as [string, ...string[]]));

const money = z.number().min(0, "Must be 0 or more").max(999_999_999).nullable();

// Payments are recorded on the customer (recordCustomerPayment below), so they aren't editable here.
const leadPatchSchema = z
  .object({
    services: services.min(1, "Choose at least one service"),
    leadStatus: z.enum(LEAD_STATUSES),
    budgetQuote: money,
    dateNeeded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  })
  .partial()
  .strict();

// Staff edit a lead from the Leads dashboard. "Converted" isn't set here: it
// happens when an admin converts the lead into a customer.
export async function updateLead(id: string, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    await requireAdmin();
    const patch = parseOrThrow(leadPatchSchema, input);
    if (patch.leadStatus === "Converted") throw new Error("Use Convert on the lead's details to turn it into a customer.");
    await requests.update(id, patch);
    revalidatePath("/leads");
  });
}

const customerOpsSchema = z
  .object({
    services,
    // "Completed" goes through completeCustomer (it checks an auditor is assigned).
    progressStatus: z.enum(["In progress", "Rescheduled"]),
    projectValue: money,
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").nullable(),
    assignedAuditorId: z.string().min(1).nullable(),
  })
  .partial()
  .strict();

export async function updateCustomerOps(id: string, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    const patch = parseOrThrow(customerOpsSchema, input);
    await requireAdmin();
    // Tell the auditor when a job is given to them (only if it's a change).
    const before = patch.assignedAuditorId ? await customers.get(id).catch(() => null) : null;
    await customers.update(id, patch as never);
    if (patch.assignedAuditorId && before && before.assignedAuditorId !== patch.assignedAuditorId) {
      const place = [before.site, before.city].filter(Boolean).join(", ");
      await emailTeamMember(
        patch.assignedAuditorId,
        `New audit assigned: ${before.name}`,
        [`You have been assigned an audit for ${before.name}${place ? ` (${place})` : ""}.`, before.serviceDate ? `Service needed by: ${before.serviceDate}.` : ""].filter(Boolean),
        "/audits",
      );
    }
    revalidatePath("/customers");
    revalidatePath("/audits");
  });
}

// ---- Converting a lead ----------------------------------------------------
//
// How a job runs: we get a lead, talk to them and keep the lead up to date here, convert it into a customer,
// give them the service, and ask for payment once the service has been given. So converting needs no payment
// (payments are recorded later on the customer), and neither does completing the job.

const convertSchema = z.object({
  // The deal total is optional here; it can be added later, with the first payment at the latest.
  totalAmount: z.number().positive("Enter a valid amount, or leave it empty").max(999_999_999).nullable().optional(),
});

// Turns a pending lead into a customer. Shared by convertLead (an existing lead) and createCustomer (a customer added by hand).
async function finishConversion(id: string, totalAmount: number | null): Promise<{ customerId: string | null }> {
  const lead = (await requests.list()).find((r) => r.id === id);
  if (!lead) throw new Error("This lead no longer exists.");
  if (lead.status !== "PENDING") throw new Error("This lead was already converted or rejected.");

  await requests.update(id, {
    ...(totalAmount !== null ? { budgetQuote: totalAmount } : {}),
    leadStatus: "Converted",
  });
  try {
    const { customerId } = await requests.approve(id);
    revalidatePath("/leads");
    revalidatePath("/customers");
    revalidatePath("/");
    return { customerId };
  } catch (err) {
    if (err instanceof RepoError && (err.status === 409 || err.status === 404)) {
      throw new Error("This lead was already converted or no longer exists.");
    }
    throw err;
  }
}

// Admin turns a lead into a customer. No payment is needed yet.
export async function convertLead(id: string, input?: unknown): Promise<ActionResult<{ customerId: string | null }>> {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(convertSchema, input ?? {}, { plain: true });
    return finishConversion(id, data.totalAmount ?? null);
  });
}

// "New customer": the same details as a lead, added straight as a customer (a client who came to us by phone or referral).
export async function createCustomer(input: unknown): Promise<ActionResult<{ customerId: string | null }>> {
  return attempt(async () => {
    await requireAdmin();
    const raw = (input ?? {}) as { lead?: unknown; totalAmount?: unknown };
    const lead = parseOrThrow(leadSchema, raw.lead ?? {});
    const data = parseOrThrow(convertSchema, { totalAmount: raw.totalAmount ?? null }, { plain: true });
    const created = await requests.create(lead, { manual: true });
    try {
      return await finishConversion(created.id, data.totalAmount ?? null);
    } catch (err) {
      // Don't leave a half-made lead behind if the conversion failed.
      await requests.reject(created.id, "Removed: the customer could not be created").catch(() => undefined);
      throw err;
    }
  });
}

// ---- Completing a customer's query -----------------------------------------

// Admin marks a customer's query Completed: the service has been given. Payment is asked for after this, so none
// is needed to complete. Returns reminder: true so the screen can prompt for the report and the payment request.
export async function completeCustomer(id: string): Promise<ActionResult<{ reminder: boolean }>> {
  return attempt(async () => {
    await requireAdmin();
    const customer = await customers.get(id);
    if (!customer) throw new Error("This customer no longer exists.");
    if (!customer.assignedAuditorId) throw new Error("Assign an auditor to this query before completing it.");
    await customers.update(id, { progressStatus: "Completed" });
    revalidatePath("/customers");
    revalidatePath("/");
    return { reminder: true };
  });
}

// ---- Recording a payment on a customer ---------------------------------------

const recordPaymentSchema = paymentDetailsSchema.extend({
  amount: z.number().positive("Enter the amount received").max(999_999_999),
  totalAmount: z.number().positive().max(999_999_999).optional(),
});

// Admin records a payment (a deposit, an instalment or the final amount). Once the
// whole deal is paid the customer's status becomes "Fully Paid".
export async function recordCustomerPayment(id: string, input: unknown): Promise<ActionResult<{ status: string }>> {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(recordPaymentSchema, input, { plain: true });
    const customer = await customers.get(id);
    if (!customer) throw new Error("This customer no longer exists.");

    // Customers added by hand may have no deal total yet; it is entered with the first payment.
    const total = customer.projectValue ?? data.totalAmount ?? null;
    if (total === null) throw new Error("Enter the total amount of the deal.");
    const balance = Math.round((total - customer.amountPaid) * 100) / 100;
    if (balance <= 0) throw new Error("This customer has already paid in full.");
    if (data.amount > balance + 0.004) throw new Error(`The most you can record is ${balance.toFixed(2)} (the balance still due).`);

    const payments = [...customer.payments, makePayment(data.amount, data)];
    const paid = sumPayments(payments);
    const status = paid >= total - 0.004 ? "Full Payment" : "Partial";
    const patch: Partial<CustomerInput> = {
      payments,
      amountPaid: paid,
      paymentStatus: status,
      paymentProofs: allProofs(payments),
    };
    if (customer.projectValue === null) patch.projectValue = total;
    await customers.update(id, patch);
    revalidatePath("/customers");
    return { status };
  });
}
