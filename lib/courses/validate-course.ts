import type { CourseWeekType } from "@/lib/types";

export const courseConflictMessage = "这门课和已有课程时间冲突，请检查课表。";

export type CourseConflictCandidate = {
  id?: string;
  userId?: string;
  semesterId?: string;
  name: string;
  teacher?: string;
  location?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  weekType: CourseWeekType | string;
  color?: string;
};

export type CourseValidationResult = {
  valid: boolean;
  errors: string[];
};

export type CourseConflictResult = {
  hasConflict: boolean;
  error?: string;
  conflictCourse?: CourseConflictCandidate;
};

export function validateCourseInput(course: CourseConflictCandidate): CourseValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(course.weekday) || course.weekday < 1 || course.weekday > 7) {
    errors.push("weekday 必须是 1-7。");
  }

  if (!isValidTime(course.startTime) || !isValidTime(course.endTime)) {
    errors.push("startTime 和 endTime 必须是 HH:mm 格式。");
  } else if (timeToMinutes(course.startTime) >= timeToMinutes(course.endTime)) {
    errors.push("startTime 必须早于 endTime。");
  }

  if (!Number.isInteger(course.startWeek) || !Number.isInteger(course.endWeek)) {
    errors.push("startWeek 和 endWeek 必须是整数。");
  } else if (course.startWeek > course.endWeek) {
    errors.push("startWeek 必须小于等于 endWeek。");
  }

  if (!isValidWeekType(course.weekType)) {
    errors.push("weekType 必须是 all、odd、even。");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function checkCourseConflict(
  targetCourse: CourseConflictCandidate,
  existingCourses: CourseConflictCandidate[],
  options: { excludeCourseId?: string } = {}
): CourseConflictResult {
  const conflictCourse = existingCourses.find((existingCourse) =>
    areCoursesConflicting(targetCourse, existingCourse, options.excludeCourseId)
  );

  if (!conflictCourse) {
    return { hasConflict: false };
  }

  return {
    hasConflict: true,
    error: courseConflictMessage,
    conflictCourse
  };
}

export function findCourseConflicts(
  courses: CourseConflictCandidate[],
  existingCourses: CourseConflictCandidate[] = []
): string[] {
  const errors: string[] = [];
  const acceptedCourses: CourseConflictCandidate[] = [...existingCourses];

  courses.forEach((course) => {
    const validation = validateCourseInput(course);

    if (!validation.valid) {
      errors.push(...validation.errors.map((error) => `${course.name || "未命名课程"}：${error}`));
      return;
    }

    const conflict = checkCourseConflict(course, acceptedCourses);

    if (conflict.hasConflict) {
      errors.push(`${course.name || "未命名课程"}：${courseConflictMessage}`);
      return;
    }

    acceptedCourses.push(course);
  });

  return errors;
}

function areCoursesConflicting(
  targetCourse: CourseConflictCandidate,
  existingCourse: CourseConflictCandidate,
  excludeCourseId?: string
): boolean {
  if (excludeCourseId && existingCourse.id === excludeCourseId) {
    return false;
  }

  if (targetCourse.id && existingCourse.id && targetCourse.id === existingCourse.id) {
    return false;
  }

  if (
    targetCourse.userId &&
    existingCourse.userId &&
    targetCourse.userId !== existingCourse.userId
  ) {
    return false;
  }

  if (
    targetCourse.semesterId &&
    existingCourse.semesterId &&
    targetCourse.semesterId !== existingCourse.semesterId
  ) {
    return false;
  }

  return (
    targetCourse.weekday === existingCourse.weekday &&
    timeRangesOverlap(
      targetCourse.startTime,
      targetCourse.endTime,
      existingCourse.startTime,
      existingCourse.endTime
    ) &&
    weekRangesOverlap(
      targetCourse.startWeek,
      targetCourse.endWeek,
      existingCourse.startWeek,
      existingCourse.endWeek
    ) &&
    weekTypesOverlap(targetCourse.weekType, existingCourse.weekType)
  );
}

function isValidWeekType(weekType: string): weekType is CourseWeekType {
  return weekType === "all" || weekType === "odd" || weekType === "even";
}

function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function weekRangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA <= endB && startB <= endA;
}

function weekTypesOverlap(weekTypeA: string, weekTypeB: string): boolean {
  if (weekTypeA === "all" || weekTypeB === "all") {
    return true;
  }

  return weekTypeA === weekTypeB;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

