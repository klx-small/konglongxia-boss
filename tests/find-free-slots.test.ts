import { describe, expect, it } from "vitest";

import { findFreeSlots } from "@/lib/scheduler/findFreeSlots";
import type { SchedulerCourse } from "@/lib/scheduler/types";

const baseCourses: SchedulerCourse[] = [
  {
    id: "math",
    name: "高等数学",
    weekday: 1,
    startTime: "08:00",
    endTime: "09:40",
    startWeek: 1,
    endWeek: 16,
    weekType: "all"
  },
  {
    id: "english",
    name: "大学英语",
    weekday: 1,
    startTime: "10:10",
    endTime: "11:50",
    startWeek: 1,
    endWeek: 16,
    weekType: "all"
  },
  {
    id: "computer",
    name: "计算机基础",
    weekday: 3,
    startTime: "14:00",
    endTime: "15:40",
    startWeek: 1,
    endWeek: 16,
    weekType: "all"
  }
];

describe("findFreeSlots", () => {
  it("课程时间占用后正确计算空闲时间", () => {
    const result = findFreeSlots({
      courses: baseCourses.slice(0, 1),
      fixedTimeBlocks: [],
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-15" },
      userPreferences: { currentWeek: 1 }
    });

    expect(result[0].date).toBe("2026-06-15");
    expect(result[0].freeSlots.some((slot) => slot.startTime === "08:00")).toBe(false);
    expect(result[0].freeSlots).toContainEqual({
      startTime: "09:40",
      endTime: "12:00",
      durationMinutes: 140
    });
  });

  it("课很多的一天空闲时间减少", () => {
    const result = findFreeSlots({
      courses: baseCourses.slice(0, 2),
      fixedTimeBlocks: [],
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-16" },
      userPreferences: { currentWeek: 1 }
    });

    const monday = result.find((day) => day.date === "2026-06-15");
    const tuesday = result.find((day) => day.date === "2026-06-16");

    expect(monday?.totalFreeMinutes).toBeLessThan(tuesday?.totalFreeMinutes ?? 0);
  });

  it("无课程的一天空闲时间较多", () => {
    const result = findFreeSlots({
      courses: [],
      fixedTimeBlocks: [],
      dateRange: { startDate: "2026-06-16", endDate: "2026-06-16" },
      userPreferences: { currentWeek: 1 }
    });

    expect(result[0].totalFreeMinutes).toBe(810);
    expect(result[0].freeSlots).toContainEqual({
      startTime: "07:30",
      endTime: "12:00",
      durationMinutes: 270
    });
  });

  it("过滤单双周课程", () => {
    const result = findFreeSlots({
      courses: [
        {
          id: "odd",
          name: "单周专题",
          weekday: 1,
          startTime: "08:00",
          endTime: "09:40",
          startWeek: 1,
          endWeek: 16,
          weekType: "odd"
        }
      ],
      fixedTimeBlocks: [],
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-15" },
      userPreferences: { currentWeek: 2 }
    });

    expect(result[0].totalFreeMinutes).toBe(810);
  });
});
