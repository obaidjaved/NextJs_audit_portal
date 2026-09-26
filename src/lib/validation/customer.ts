import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  site: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  contact: z.string().optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  phone: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
