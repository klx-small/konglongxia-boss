import { describe, expect, it } from "vitest";

import {
  normalizeWeekday,
  normalizeWeekType,
  parseCourseCsv
} from "@/lib/courses/course-csv";

const normalCsv = `课程名,星期,开始时间,结束时间,开始周,结束周,单双周,教室,老师
高等数学,周一,08:00,09:40,1,16,每周,A101,王老师
大学英语,周三,10:10,11:50,1,16,单周,B203,李老师
计算机基础,周五,14:00,15:40,1,12,双周,C305,张老师`;

describe("课表 CSV 解析", () => {
  it("解析正常 CSV 导入内容", () => {
    const result = parseCourseCsv(normalCsv);

    expect(result.errors).toEqual([]);
    expect(result.courses).toHaveLength(3);
    expect(result.courses[0]).toMatchObject({
      name: "高等数学",
      weekday: 1,
      startTime: "08:00",
      endTime: "09:40",
      startWeek: 1,
      endWeek: 16,
      weekType: "all",
      location: "A101",
      teacher: "王老师"
    });
  });

  it("解析中文星期表达", () => {
    expect(normalizeWeekday("周一")).toBe(1);
    expect(normalizeWeekday("星期三")).toBe(3);
    expect(normalizeWeekday("五")).toBe(5);
    expect(normalizeWeekday("周日")).toBe(7);
  });

  it("解析单双周表达", () => {
    expect(normalizeWeekType("每周")).toBe("all");
    expect(normalizeWeekType("单周")).toBe("odd");
    expect(normalizeWeekType("双周")).toBe("even");
  });

  it("数据格式错误时返回中文错误提示", () => {
    const result = parseCourseCsv(`课程名,星期,开始时间,结束时间,开始周,结束周,单双周,教室,老师
高等数学,周八,08:00,09:40,1,16,每周,A101,王老师`);

    expect(result.courses).toEqual([]);
    expect(result.errors[0]).toContain("第 2 行");
    expect(result.errors[0]).toContain("星期格式错误");
  });
});

