import { z } from "zod";
import { passwordProblem } from "./password";

export const createUserSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().superRefine((v, ctx) => {
      const problem = passwordProblem(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
    role: z.enum(["ADMIN", "INSPECTOR"]),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
