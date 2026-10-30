"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { templates, RepoError } from "@/lib/repo";
import { templateSchema } from "@/lib/validation/template";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt } from "./result";

// These intentionally return data rather than calling redirect(): they're
// invoked imperatively from client components (inside try/catch, via
// startTransition), and redirect()'s thrown NEXT_REDIRECT signal must not
// be caught there — the caller navigates itself with useRouter().

export async function createTemplate(input: unknown) {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(templateSchema, input);
    const template = await templates.create(data);
    revalidatePath("/templates");
    return { id: template.id };
  });
}

export async function updateTemplate(id: string, input: unknown) {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(templateSchema, input);
    await templates.update(id, data);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { id };
  });
}

export async function deleteTemplate(id: string) {
  return attempt(async () => {
    await requireAdmin();
    try {
      await templates.remove(id);
    } catch (err) {
      // The backend refuses (409) while audits or schedules still reference this template.
      if (err instanceof RepoError && err.status === 409) {
        throw new Error("Can't delete — this template has audits or schedules using it.");
      }
      throw err;
    }
    revalidatePath("/templates");
  });
}
