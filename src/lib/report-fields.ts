import type { ResponseObject } from "@/lib/scoring";

interface FieldLike {
  label?: string;
  type?: string;
  autofill?: string;
}

// Inspector name, date and location are filled in automatically and already appear in the report's header,
// so they are left out of the findings. Templates mark them with "autofill"; for older templates that don't,
// the plain labels (Inspector name / Date / Location) are recognised too.
const LEGACY: [string, RegExp][] = [
  ["text", /^inspector( name)?$/i],
  ["date", /^(date|date of service( given)?)$/i],
  ["location", /^(location|site|site address)$/i],
];

export function headerFieldLabels(template: { fields?: unknown } | null | undefined): Set<string> {
  const fields = Array.isArray(template?.fields) ? (template.fields as FieldLike[]) : [];
  const labels = new Set<string>();
  for (const f of fields) {
    if (f.label && (f.autofill || LEGACY.some(([type, re]) => f.type === type && re.test(f.label as string)))) labels.add(f.label);
  }
  return labels;
}

// The responses to list as findings: not the signature (shown at the end) and not the header details.
export function findingResponses(responses: ResponseObject[], template: { fields?: unknown } | null | undefined): ResponseObject[] {
  const header = headerFieldLabels(template);
  // Plain-labelled ones are recognised on the response itself too, in case the template was edited after the audit was done.
  const plain = (r: ResponseObject) => LEGACY.some(([type, re]) => r.type === type && re.test(r.label));
  return responses.filter((r) => r.type !== "signature" && !header.has(r.label) && !plain(r));
}
