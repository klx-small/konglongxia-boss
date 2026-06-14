import type { Course, CourseWeekType } from "@/lib/types";
import type { SchedulerCourse } from "@/lib/scheduler/types";

export const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function getWeekdayLabel(weekday: number): string {
  return weekdayLabels[weekday - 1] ?? "未知";
}

export function getWeekTypeLabel(weekType: CourseWeekType): string {
  const labels: Record<CourseWeekType, string> = {
    all: "每周",
    odd: "单周",
    even: "双周"
  };

  return labels[weekType];
}

export function formatCourseTime(course: Pick<Course, "startTime" | "endTime">): string {
  return `${course.startTime} - ${course.endTime}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} 分钟`;
  }

  if (remainingMinutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${remainingMinutes} 分钟`;
}

export function toSchedulerCourse(course: Course): SchedulerCourse {
  return {
    id: course.id,
    name: course.name,
    weekday: course.weekday,
    startTime: course.startTime,
    endTime: course.endTime,
    startWeek: course.startWeek,
    endWeek: course.endWeek,
    weekType: course.weekType
  };
}

export function createCourseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
