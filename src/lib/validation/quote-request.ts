import { z } from "zod";
import { ALL_SERVICES, TRAINING_OPTIONS, US_STATES } from "@/lib/quote-options";

const required = (label: string, max = 120) => z.string().trim().min(1, `${label} is required`).max(max);
const optional = (max = 120) => z.string().trim().max(max).default("");

export const quoteRequestSchema = z.object({
  firstName: required("First name", 80),
  lastName: required("Last name", 80),
  companyName: required("Company name", 160),
  title: optional(120),
  street: required("Street address", 200),
  street2: optional(200),
  city: required("City", 100),
  state: z.enum(US_STATES as [string, ...string[]], { message: "Select a state" }),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(30)
    .regex(/^[+\d()\-.\s]{7,}$/, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  services: z.array(z.enum(ALL_SERVICES as [string, ...string[]])).min(1, "Choose at least one type of service"),
  trainings: z.array(z.enum(TRAINING_OPTIONS as [string, ...string[]])).min(1, "Choose at least one type of training (or N/A)"),
  dateNeeded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date you need service by"),
  additionalInfo: optional(4000),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
