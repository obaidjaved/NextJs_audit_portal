import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    role: z.enum(["ADMIN", "INSPECTOR"]),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
