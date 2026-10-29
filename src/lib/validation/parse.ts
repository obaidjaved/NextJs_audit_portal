import type { z } from "zod";

// zod's default ZodError.message is a JSON-stringified issue array — fine
// for logs, unreadable if it ever reaches a user. Server Actions here throw
// plain Errors instead, whose .message client components display directly.
// `plain` drops the "field:" prefix, for forms whose messages already read as sentences.
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, opts: { plain?: boolean } = {}): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  const field = first.path.join(".");
  throw new Error(field && !opts.plain ? `${field}: ${first.message}` : first.message);
}
