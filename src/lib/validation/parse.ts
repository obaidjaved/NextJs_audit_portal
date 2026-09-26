import type { z } from "zod";

// zod's default ZodError.message is a JSON-stringified issue array — fine
// for logs, unreadable if it ever reaches a user. Server Actions here throw
// plain Errors instead, whose .message client components display directly.
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const field = first.path.join(".");
  throw new Error(field ? `${field}: ${first.message}` : first.message);
}
