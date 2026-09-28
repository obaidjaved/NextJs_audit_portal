import { audits, type Category } from "@/lib/repo";

const PREFIX: Record<Category, string> = {
  ELECTRICAL: "EL",
  PLUMBING: "PL",
  HVAC: "HV",
  SAFETY: "SF",
  GENERAL: "GN",
};

// The sequence is incremented atomically by WordPress; a unique index on the
// document number is the final guard (callers retry on a duplicate).
export async function nextDocNumber(category: Category): Promise<string> {
  const seq = await audits.nextDocSeq(category);
  return `${PREFIX[category]}-${String(seq).padStart(4, "0")}`;
}
