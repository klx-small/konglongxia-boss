import type { DailyFreeSlots, FindFreeSlotsInput, FreeSlot, SchedulerCourse } from "./types";

const defaultMealBlocks = [
  { startTime: "12:00", endTime: "13:30", title: "午饭" },
  { startTime: "18:00", endTime: "19:00", title: "晚饭" }
];

export function findFreeSlots({
  courses,
  fixedTimeBlocks,
  dateRange,
  userPreferences = {}
}: FindFreeSlotsInput): DailyFreeSlots[] {
  const currentWeek = userPreferences.currentWeek ?? 1;
  const minSlotMinutes = userPreferences.minSlotMinutes ?? 25;
  const dayStartTime = userPreferences.dayStartTime ?? userPreferences.sleepEndTime ?? "07:30";
  const dayEndTime = userPreferences.dayEndTime ?? userPreferences.sleepStartTime ?? "23:30";
  const mealBlocks = userPreferences.mealBlocks ?? defaultMealBlocks;

  return enumerateDates(dateRange.startDate, dateRange.endDate).map((date) => {
    const weekday = getChineseWeekdayNumber(date);
    const busyBlocks = [
      ...courses
        .filter((course) => isCourseActiveOnDay(course, weekday, currentWeek))
        .map((course) => ({ startTime: course.startTime, endTime: course.endTime })),
      ...fixedTimeBlocks
        .filter((block) => block.date === date)
        .map((block) => ({ startTime: block.startTime, endTime: block.endTime })),
      ...mealBlocks
    ].map((block) => ({
      start: timeToMinutes(block.startTime),
      end: timeToMinutes(block.endTime)
    }));

    const freeSlots = subtractBusyBlocks(
      timeToMinutes(dayStartTime),
      timeToMinutes(dayEndTime),
      busyBlocks,
      minSlotMinutes
    );

    return {
      date,
      weekday,
      freeSlots,
      totalFreeMinutes: freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0)
    };
  });
}

function isCourseActiveOnDay(course: SchedulerCourse, weekday: number, currentWeek: number): boolean {
  if (course.weekday !== weekday) {
    return false;
  }

  if (currentWeek < course.startWeek || currentWeek > course.endWeek) {
    return false;
  }

  if (course.weekType === "odd") {
    return currentWeek % 2 === 1;
  }

  if (course.weekType === "even") {
    return currentWeek % 2 === 0;
  }

  return true;
}

function subtractBusyBlocks(
  dayStart: number,
  dayEnd: number,
  busyBlocks: Array<{ start: number; end: number }>,
  minSlotMinutes: number
): FreeSlot[] {
  const normalizedBusyBlocks = busyBlocks
    .map((block) => ({
      start: Math.max(dayStart, block.start),
      end: Math.min(dayEnd, block.end)
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);

  const mergedBusyBlocks: Array<{ start: number; end: number }> = [];

  normalizedBusyBlocks.forEach((block) => {
    const previous = mergedBusyBlocks[mergedBusyBlocks.length - 1];

    if (!previous || block.start > previous.end) {
      mergedBusyBlocks.push({ ...block });
      return;
    }

    previous.end = Math.max(previous.end, block.end);
  });

  const freeSlots: FreeSlot[] = [];
  let cursor = dayStart;

  mergedBusyBlocks.forEach((block) => {
    if (block.start - cursor >= minSlotMinutes) {
      freeSlots.push(toFreeSlot(cursor, block.start));
    }

    cursor = Math.max(cursor, block.end);
  });

  if (dayEnd - cursor >= minSlotMinutes) {
    freeSlots.push(toFreeSlot(cursor, dayEnd));
  }

  return freeSlots;
}

function toFreeSlot(start: number, end: number): FreeSlot {
  return {
    startTime: minutesToTime(start),
    endTime: minutesToTime(end),
    durationMinutes: end - start
  };
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = parseDate(startDate);
  const end = parseDate(endDate);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getChineseWeekdayNumber(date: string): number {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

