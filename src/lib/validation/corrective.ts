import { z } from "zod";

export const correctiveActionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  customerId: z.string().min(1, "Customer is required"),
  auditId: z.string().nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .nullable()
    .default(null),
});

export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;
