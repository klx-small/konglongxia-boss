import { describe, expect, it } from "vitest";

import {
  checkCourseConflict,
  findCourseConflicts,
  validateCourseInput
} from "@/lib/courses/validate-course";
import type { CourseConflictCandidate } from "@/lib/courses/validate-course";

const baseCourse: CourseConflictCandidate = {
  id: "course-a",
  userId: "user-1",
  semesterId: "semester-1",
  name: "高等数学",
  teacher: "王老师",
  location: "A101",
  weekday: 1,
  startTime: "08:00",
  endTime: "09:40",
  startWeek: 1,
  endWeek: 16,
  weekType: "all",
  color: "#13795b"
};

function course(overrides: Partial<CourseConflictCandidate>): CourseConflictCandidate {
  return {
    ...baseCourse,
    id: overrides.id ?? `course-${Math.random()}`,
    ...overrides
  };
}

describe("课程输入校验", () => {
  it("validateCourseInput 接受合法课程", () => {
    const result = validateCourseInput(baseCourse);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validateCourseInput 拒绝非法星期、时间、周次和单双周", () => {
    const result = validateCourseInput({
      ...baseCourse,
      weekday: 8,
      startTime: "09:40",
      endTime: "08:00",
      startWeek: 16,
      endWeek: 1,
      weekType: "bad"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("weekday 必须是 1-7。");
    expect(result.errors).toContain("startTime 必须早于 endTime。");
    expect(result.errors).toContain("startWeek 必须小于等于 endWeek。");
    expect(result.errors).toContain("weekType 必须是 all、odd、even。");
  });
});

describe("课程冲突校验", () => {
  it("单周和双周同时间不冲突", () => {
    const odd = course({ id: "odd", weekType: "odd" });
    const even = course({ id: "even", weekType: "even" });

    expect(checkCourseConflict(odd, [even]).hasConflict).toBe(false);
  });

  it("每周和单周同时间冲突", () => {
    const weekly = course({ id: "weekly", weekType: "all" });
    const odd = course({ id: "odd", weekType: "odd" });

    const result = checkCourseConflict(weekly, [odd]);

    expect(result.hasConflict).toBe(true);
    expect(result.error).toBe("这门课和已有课程时间冲突，请检查课表。");
  });

  it("周数不重叠不冲突", () => {
    const firstHalf = course({ id: "first", startWeek: 1, endWeek: 8 });
    const secondHalf = course({ id: "second", startWeek: 9, endWeek: 16 });

    expect(checkCourseConflict(firstHalf, [secondHalf]).hasConflict).toBe(false);
  });

  it("时间重叠冲突", () => {
    const target = course({ id: "target", startTime: "08:00", endTime: "09:40" });
    const existing = course({ id: "existing", startTime: "09:00", endTime: "10:30" });

    expect(checkCourseConflict(target, [existing]).hasConflict).toBe(true);
  });

  it("时间相邻不冲突", () => {
    const target = course({ id: "target", startTime: "08:00", endTime: "09:40" });
    const existing = course({ id: "existing", startTime: "09:40", endTime: "10:30" });

    expect(checkCourseConflict(target, [existing]).hasConflict).toBe(false);
  });

  it("编辑课程时不和自身冲突", () => {
    const target = course({ id: "course-a", name: "高等数学精讲" });

    expect(checkCourseConflict(target, [baseCourse], { excludeCourseId: "course-a" }).hasConflict).toBe(
      false
    );
  });

  it("CSV 内部冲突能被识别", () => {
    const conflicts = findCourseConflicts([
      course({ id: "csv-1", name: "高等数学", startTime: "08:00", endTime: "09:40" }),
      course({ id: "csv-2", name: "大学英语", startTime: "09:00", endTime: "10:30" })
    ]);

    expect(conflicts).toEqual(["大学英语：这门课和已有课程时间冲突，请检查课表。"]);
  });
});

