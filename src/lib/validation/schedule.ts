import { z } from "zod";

export const scheduleSchema = z.object({
  title: z.string().min(1, "Schedule title is required"),
  templateId: z.string(),
  customerId: z.string(),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  active: z.boolean().default(true),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
