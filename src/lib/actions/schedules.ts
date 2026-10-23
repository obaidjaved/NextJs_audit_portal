"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/access";
import { schedules } from "@/lib/repo";
import { scheduleSchema } from "@/lib/validation/schedule";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt } from "./result";

export async function createSchedule(input: unknown) {
  return attempt(async () => {
    await requireStaff();
    const data = parseOrThrow(scheduleSchema, input);
    // startDate stays a plain "YYYY-MM-DD" string end to end (no timezone to get wrong).
    const schedule = await schedules.create(data);
    revalidatePath("/schedules");
    return { id: schedule.id };
  });
}

export async function setScheduleActive(id: string, active: boolean) {
  return attempt(async () => {
    await requireStaff();
    await schedules.setActive(id, active);
    revalidatePath("/schedules");
  });
}

export async function deleteSchedule(id: string) {
  return attempt(async () => {
    await requireStaff();
    await schedules.remove(id);
    revalidatePath("/schedules");
  });
}
