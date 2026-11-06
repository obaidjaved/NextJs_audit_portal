import { z } from "zod";
import { isSafeMediaSrc, MEDIA_MESSAGE } from "./media";

const media = z.string().refine(isSafeMediaSrc, MEDIA_MESSAGE);
const mediaOrNull = media.nullable();

const optionRef = z.object({ label: z.string(), score: z.number().nullable(), fail: z.boolean() }).nullable();

export const responseSchema = z.discriminatedUnion("type", [
  z.object({ label: z.string(), type: z.literal("status"), value: z.enum(["pass", "marginal", "fail"]) }),
  z.object({ label: z.string(), type: z.literal("choice"), option: optionRef }),
  z.object({ label: z.string(), type: z.literal("checkbox"), value: z.boolean(), checked: z.array(z.string()).optional() }),
  z.object({ label: z.string(), type: z.literal("photo"), value: mediaOrNull, caption: z.string() }),
  z.object({ label: z.string(), type: z.literal("annotation"), value: mediaOrNull, caption: z.string() }),
  z.object({ label: z.string(), type: z.literal("signature"), value: mediaOrNull }),
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

export const auditPhotoSchema = z.object({ id: z.string().max(100), src: media });

export const auditInputSchema = z.object({
  templateId: z.string(),
  customerId: z.string(),
  responses: z.array(responseSchema),
  notes: z.string().default(""),
  photos: z.array(auditPhotoSchema).max(200).default([]),
  signature: mediaOrNull.default(null),
  draft: z.boolean().default(true),
});

export type AuditInput = z.infer<typeof auditInputSchema>;
