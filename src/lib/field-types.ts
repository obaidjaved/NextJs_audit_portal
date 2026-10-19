export type FieldType =
  | "status"
  | "choice"
  | "checkbox"
  | "photo"
  | "annotation"
  | "signature"
  | "slider"
  | "number"
  | "date"
  | "location"
  | "text"
  | "instruction";

export interface FieldTypeDef {
  type: FieldType;
  label: string;
  icon: string;
  colorToken: string;
}

export const FIELD_TYPES: FieldTypeDef[] = [
  { type: "status", label: "Pass / Fail Status", icon: "check-circle", colorToken: "--ok" },
  { type: "choice", label: "Multiple Choice", icon: "list-checks", colorToken: "--accent" },
  { type: "checkbox", label: "Checkbox", icon: "square-check", colorToken: "--pending" },
  { type: "photo", label: "Media", icon: "image", colorToken: "--sun-deep" },
  { type: "annotation", label: "Annotation", icon: "pencil", colorToken: "--warn" },
  { type: "signature", label: "Signature", icon: "signature", colorToken: "--ink" },
  { type: "slider", label: "Slider", icon: "sliders", colorToken: "--accent-deep" },
  { type: "number", label: "Number", icon: "hash", colorToken: "--pending" },
  { type: "date", label: "Date", icon: "calendar", colorToken: "--ok" },
  { type: "location", label: "Location", icon: "map-pin", colorToken: "--danger" },
  { type: "text", label: "Text", icon: "type", colorToken: "--ink-2" },
  { type: "instruction", label: "Instruction (display-only)", icon: "info", colorToken: "--ink-3" },
];

export const FIELD_TYPE_MAP: Record<FieldType, FieldTypeDef> = Object.fromEntries(
  FIELD_TYPES.map((f) => [f.type, f]),
) as Record<FieldType, FieldTypeDef>;

export interface ChoiceOption {
  label: string;
  score: number | null;
  fail: boolean;
}

export interface ResponseSetPreset {
  key: string;
  name: string;
  options: ChoiceOption[];
}

export const RESPONSE_SETS: ResponseSetPreset[] = [
  {
    key: "pass-fail",
    name: "Pass / Fail",
    options: [
      { label: "Pass", score: 100, fail: false },
      { label: "Fail", score: 0, fail: true },
    ],
  },
  {
    key: "good-fair-poor",
    name: "Good / Fair / Poor",
    options: [
      { label: "Good", score: 100, fail: false },
      { label: "Fair", score: 60, fail: false },
      { label: "Poor", score: 0, fail: true },
    ],
  },
  {
    key: "safe-at-risk",
    name: "Safe / At Risk",
    options: [
      { label: "Safe", score: 100, fail: false },
      { label: "At Risk", score: 0, fail: true },
    ],
  },
  {
    key: "yes-no",
    name: "Yes / No",
    options: [
      { label: "Yes", score: 100, fail: false },
      { label: "No", score: 0, fail: false },
    ],
  },
  {
    key: "compliant",
    name: "Compliant / Non-Compliant",
    options: [
      { label: "Compliant", score: 100, fail: false },
      { label: "Non-Compliant", score: 0, fail: true },
    ],
  },
];

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  presetKey?: string;
  options?: ChoiceOption[];
  // Help text shown under the field name.
  description?: string;
  // Checkbox only: names of the individual checkboxes. Empty/absent = one
  // plain checkbox (how older templates behave).
  items?: string[];
  // Pre-filled when an audit is started: the signed-in inspector, today, or
  // the customer's site address.
  autofill?: "inspector" | "date" | "site";
}

export const hasCheckboxItems = (f: TemplateField) => f.type === "checkbox" && (f.items?.length ?? 0) > 0;

// Fields every new template starts with; edit or delete any of them.
export function defaultTemplateFields(): TemplateField[] {
  const mk = (n: string, f: Omit<TemplateField, "id">): TemplateField => ({ id: `field-default-${n}`, ...f });
  return [
    mk("inspector", { label: "Inspector name", type: "text", required: true, autofill: "inspector" }),
    mk("date", { label: "Date", type: "date", required: true, autofill: "date" }),
    mk("location", { label: "Location", type: "location", required: false, autofill: "site" }),
    mk("instruction", { label: "Review the customer's scope and site instructions before you start.", type: "instruction", required: false }),
    mk("remarks", { label: "Remarks of inspector", type: "text", required: false }),
    mk("signature", { label: "Signature", type: "signature", required: true }),
  ];
}

// True for field types whose response is always considered "filled" —
// matches design-3.html's fieldHasValue(), so required-field validation
// never blocks on these.
export function fieldAlwaysSatisfied(type: FieldType, field?: TemplateField): boolean {
  if (type === "checkbox") return !(field && hasCheckboxItems(field));
  return type === "slider" || type === "instruction";
}

export function buildResponse(field: TemplateField) {
  const label = field.label;
  switch (field.type) {
    case "status":
      return { label, type: "status" as const, value: "pass" as const };
    case "choice":
      return { label, type: "choice" as const, option: null };
    case "checkbox":
      return hasCheckboxItems(field)
        ? { label, type: "checkbox" as const, value: false, checked: [] as string[] }
        : { label, type: "checkbox" as const, value: false };
    case "photo":
      return { label, type: "photo" as const, value: null, caption: "" };
    case "annotation":
      return { label, type: "annotation" as const, value: null, caption: "" };
    case "signature":
      return { label, type: "signature" as const, value: null };
    case "slider":
      return { label, type: "slider" as const, value: "50" };
    case "number":
      return { label, type: "number" as const, value: "" };
    case "date":
      return { label, type: "date" as const, value: "" };
    case "location":
      return { label, type: "location" as const, value: "", coords: null };
    case "text":
      return { label, type: "text" as const, value: "" };
    case "instruction":
      return null;
  }
}
