"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/access";
import { customers, requests, RepoError, type CustomerInput } from "@/lib/repo";
import { LEAD_STATUSES } from "@/lib/ops-options";
import { ALL_SERVICES } from "@/lib/quote-options";
import { parseOrThrow } from "@/lib/validation/parse";
import { allProofs, makePayment, paymentDetailsSchema, sumPayments } from "@/lib/payments";
import { attempt, type ActionResult } from "./result";

const services = z.array(z.enum(ALL_SERVICES as [string, ...string[]]));

const money = z.number().min(0, "Must be 0 or more").max(999_999_999).nullable();

// Payments are recorded only through convertLead / completeCustomer below, so they aren't editable here.
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
    // "Completed" goes through completeCustomer, which records the final payment first.
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
    // Handing a customer to an auditor is an administrator's call.
    if (patch.assignedAuditorId !== undefined) await requireAdmin();
    else await requireStaff();
    await customers.update(id, patch as never);
    revalidatePath("/customers");
  });
}

// ---- Converting a lead ----------------------------------------------------

const convertSchema = paymentDetailsSchema.extend({
  totalAmount: z.number().positive("Enter the total amount of the deal").max(999_999_999),
  status: z.enum(["Full Payment", "Partial"], { message: "Choose Fully paid or Partial" }),
  amountPaid: z.number().positive("Enter the amount paid").max(999_999_999),
});

// Admin turns a lead into a customer. They must record the payment received
// (amount, method, date, transaction id and a screenshot), which is kept on
// the customer from then on.
export async function convertLead(id: string, input: unknown): Promise<ActionResult<{ customerId: string | null }>> {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(convertSchema, input, { plain: true });
    // "Fully paid" means the whole deal was paid; "Partial" must be less than the total.
    const paid = data.status === "Full Payment" ? data.totalAmount : data.amountPaid;
    if (data.status === "Partial" && paid >= data.totalAmount) {
      throw new Error("A partial payment must be less than the total amount. Choose “Fully paid” if the whole amount was paid.");
    }
    const lead = (await requests.list()).find((r) => r.id === id);
    if (!lead) throw new Error("This lead no longer exists.");
    if (lead.status !== "PENDING") throw new Error("This lead was already converted or rejected.");

    const payment = makePayment(paid, data);
    await requests.update(id, {
      budgetQuote: data.totalAmount,
      amountPaid: sumPayments([payment]),
      paymentStatus: data.status,
      paymentProofs: allProofs([payment]),
      payments: [payment],
      leadStatus: "Converted",
    });
    try {
      const { customerId } = await requests.approve(id);
      revalidatePath("/leads");
      revalidatePath("/customers");
      return { customerId };
    } catch (err) {
      if (err instanceof RepoError && (err.status === 409 || err.status === 404)) {
        throw new Error("This lead was already converted or no longer exists.");
      }
      throw err;
    }
  });
}

// ---- Completing a customer's query -----------------------------------------

// Admin marks a customer's query Completed. If the deal isn't fully paid yet
// the final instalment (the remaining balance) must be recorded first. Returns
// whether payment is now complete so the screen can remind the admin to send the report.
export async function completeCustomer(id: string, input?: unknown): Promise<ActionResult<{ reminder: boolean }>> {
  return attempt(async () => {
    await requireAdmin();
    const customer = await customers.get(id);
    if (!customer) throw new Error("This customer no longer exists.");
    if (!customer.assignedAuditorId) throw new Error("Assign an auditor to this query before completing it.");

    const extra = (input ?? {}) as { totalAmount?: unknown; alreadyPaid?: unknown };
    const patch: Partial<CustomerInput> = { progressStatus: "Completed" };
    if (customer.paymentStatus !== "Full Payment") {
      // Customers added by hand (or converted before payments were tracked) may have no deal total yet.
      let total = customer.projectValue;
      if (total === null) {
        const entered = Number(extra.totalAmount);
        if (!Number.isFinite(entered) || entered <= 0) throw new Error("Enter the total amount of the deal.");
        total = Math.round(entered * 100) / 100;
        patch.projectValue = total;
      }
      // The final instalment is whatever is still owed.
      const balance = Math.round((total - customer.amountPaid) * 100) / 100;
      if (extra.alreadyPaid === true && customer.payments.length === 0) {
        // Nothing was ever recorded here, and the admin confirms it was all paid earlier.
        patch.amountPaid = total;
      } else if (balance > 0) {
        const details = parseOrThrow(paymentDetailsSchema, input, { plain: true });
        const payments = [...customer.payments, makePayment(balance, details)];
        patch.payments = payments;
        patch.amountPaid = sumPayments(payments);
        patch.paymentProofs = allProofs(payments);
      }
      patch.paymentStatus = "Full Payment";
    }
    await customers.update(id, patch);
    revalidatePath("/customers");
    return { reminder: true };
  });
}
