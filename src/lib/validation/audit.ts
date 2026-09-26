import { z } from "zod";

const optionRef = z.object({ label: z.string(), score: z.number().nullable(), fail: z.boolean() }).nullable();

export const responseSchema = z.discriminatedUnion("type", [
  z.object({ label: z.string(), type: z.literal("status"), value: z.enum(["pass", "marginal", "fail"]) }),
  z.object({ label: z.string(), type: z.literal("choice"), option: optionRef }),
  z.object({ label: z.string(), type: z.literal("checkbox"), value: z.boolean() }),
  z.object({ label: z.string(), type: z.literal("photo"), value: z.string().nullable(), caption: z.string() }),
  z.object({ label: z.string(), type: z.literal("annotation"), value: z.string().nullable(), caption: z.string() }),
  z.object({ label: z.string(), type: z.literal("signature"), value: z.string().nullable() }),
  z.object({ label: z.string(), type: z.literal("slider"), value: z.string() }),
  z.object({ label: z.string(), type: z.literal("number"), value: z.string() }),
  z.object({ label: z.string(), type: z.literal("date"), value: z.string() }),
  z.object({
    label: z.string(),
    type: z.literal("location"),
    value: z.string(),
    coords: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number() }).nullable(),
  }),
  z.object({ label: z.string(), type: z.literal("text"), value: z.string() }),
]);

export const auditPhotoSchema = z.object({ id: z.string(), src: z.string() });

export const auditInputSchema = z.object({
  templateId: z.string(),
  customerId: z.string(),
  responses: z.array(responseSchema),
  notes: z.string().default(""),
  photos: z.array(auditPhotoSchema).default([]),
  signature: z.string().nullable().default(null),
  draft: z.boolean().default(true),
});

export type AuditInput = z.infer<typeof auditInputSchema>;
