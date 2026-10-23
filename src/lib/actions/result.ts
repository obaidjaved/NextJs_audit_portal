// Production builds hide the message of an error thrown from a Server Action
// (the browser only sees a generic "An error occurred in the Server Components
// render"). So actions that have something to tell the user return a result
// instead of throwing, and the client turns a failure back into an Error.

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}

export async function attempt<T extends object = object>(fn: () => Promise<T | void>): Promise<ActionResult<T>> {
  try {
    const value = (await fn()) ?? ({} as T);
    return { ok: true, ...value };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// Client side: pass anything an action returned; throws if it reported a failure.
export function unwrap<T>(result: T): Exclude<T, { ok: false }> {
  if (result && typeof result === "object" && (result as { ok?: unknown }).ok === false) {
    throw new Error((result as unknown as { error: string }).error);
  }
  return result as Exclude<T, { ok: false }>;
}
