import type { Audit } from "./repo-types";

// Merge tags usable in email templates, e.g. "Hello {{contact_name}}".
export const MERGE_TAGS: { tag: string; label: string }[] = [
  { tag: "customer_name", label: "Customer / company name" },
  { tag: "contact_name", label: "Contact person" },
  { tag: "audit_title", label: "Audit title" },
  { tag: "audit_number", label: "Audit number" },
  { tag: "auditor_name", label: "Auditor name" },
  { tag: "service", label: "Service type" },
  { tag: "site_name", label: "Your company name" },
];

export type MergeValues = Record<string, string>;

// Unknown tags are left as they are so a typo is easy to spot; known tags with no value become blank.
export function applyMerge(text: string, values: MergeValues): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => (key in values ? values[key] : whole));
}

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "TAP Services";

export function mergeValuesFor(audit: Pick<Audit, "title" | "docNumber" | "customer" | "inspector">, extras: { service?: string; auditorName?: string } = {}): MergeValues {
  const contact = audit.customer.contact?.split(",")[0]?.trim() || audit.customer.name;
  return {
    customer_name: audit.customer.name,
    contact_name: contact,
    audit_title: audit.title,
    audit_number: audit.docNumber,
    auditor_name: extras.auditorName ?? audit.inspector?.name ?? "",
    service: extras.service ?? "",
    site_name: SITE_NAME,
  };
}
