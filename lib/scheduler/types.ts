import type { CourseWeekType } from "@/lib/types";

export type SchedulerCourse = {
  id: string;
  name: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  weekType: CourseWeekType;
};

export type FixedTimeBlock = {
  date: string;
  startTime: string;
  endTime: string;
  title?: string;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type UserSchedulePreferences = {
  currentWeek?: number;
  dayStartTime?: string;
  dayEndTime?: string;
  sleepStartTime?: string;
  sleepEndTime?: string;
  mealBlocks?: Array<{
    startTime: string;
    endTime: string;
    title?: string;
  }>;
  minSlotMinutes?: number;
};

export type FreeSlot = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type DailyFreeSlots = {
  date: string;
  weekday: number;
  freeSlots: FreeSlot[];
  totalFreeMinutes: number;
};

export type FindFreeSlotsInput = {
  courses: SchedulerCourse[];
  fixedTimeBlocks: FixedTimeBlock[];
  dateRange: DateRange;
  userPreferences?: UserSchedulePreferences;
};

