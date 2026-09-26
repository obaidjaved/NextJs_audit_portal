import { z } from "zod";

export const choiceOptionSchema = z.object({
  label: z.string().min(1),
  score: z.number().min(0).max(100).nullable(),
  fail: z.boolean(),
});

export const templateFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Field label is required"),
  type: z.enum([
    "status",
    "choice",
    "checkbox",
    "photo",
    "annotation",
    "signature",
    "slider",
    "number",
    "date",
    "location",
    "text",
    "instruction",
  ]),
  required: z.boolean(),
  presetKey: z.string().optional(),
  options: z.array(choiceOptionSchema).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.enum(["ELECTRICAL", "PLUMBING", "HVAC", "SAFETY", "GENERAL"]),
  fields: z.array(templateFieldSchema).min(1, "Add at least one field"),
  approvalRequired: z.boolean().default(false),
  reportStyle: z.enum(["MODERN", "CLASSIC"]).default("MODERN"),
  reportAccentColor: z.string().nullable().optional(),
  reportLogo: z.string().nullable().optional(),
});

export type TemplateInput = z.infer<typeof templateSchema>;
