import { toCourseDto } from "@/lib/courses/course-api";
import { toSchedulerCourse } from "@/lib/courses/course-format";
import { findFreeSlots } from "@/lib/scheduler/findFreeSlots";
import type { FreeSlotDay } from "@/lib/scheduler/scheduleTasks";

export type CourseForSchedule = Parameters<typeof toCourseDto>[0];

export function buildDateRange(start = new Date(), days = 7) {
  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(addDays(start, days - 1))
  };
}

export function buildFreeSlots({
  courses,
  dateRange,
  currentWeek = 1
}: {
  courses: CourseForSchedule[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  currentWeek?: number;
}): FreeSlotDay[] {
  return findFreeSlots({
    courses: courses.map((course) => toSchedulerCourse(toCourseDto(course))),
    fixedTimeBlocks: [],
    dateRange,
    userPreferences: { currentWeek }
  }).map((day) => ({
    date: day.date,
    weekday: day.weekday,
    totalFreeMinutes: day.totalFreeMinutes,
    slots: day.freeSlots.map((slot) => ({
      startTime: toIsoDateTime(day.date, slot.startTime),
      endTime: toIsoDateTime(day.date, slot.endTime)
    }))
  }));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00.000Z`).toISOString();
}
