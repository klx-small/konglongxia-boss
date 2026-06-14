import { prisma } from "@/lib/prisma";
import type { CourseWeekType, EditableCourse } from "@/lib/types";
import {
  checkCourseConflict,
  findCourseConflicts,
  validateCourseInput,
  type CourseConflictCandidate
} from "@/lib/courses/validate-course";

export const demoUserId = "demo-user";
export const demoSemesterId = "demo-semester-2026-spring";

export type CoursePayload = Omit<
  EditableCourse,
  "id" | "createdAt" | "updatedAt" | "userId" | "semesterId"
> & {
  userId: string;
  semesterId: string;
  id?: string;
};

export async function ensureDemoSemester() {
  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {},
    create: {
      id: demoUserId,
      nickname: "恐龙侠",
      timezone: "Asia/Shanghai"
    }
  });

  return prisma.semester.upsert({
    where: { id: demoSemesterId },
    update: {},
    create: {
      id: demoSemesterId,
      userId: demoUserId,
      name: "2026 春季学期",
      startDate: new Date("2026-02-24T00:00:00.000Z"),
      endDate: new Date("2026-07-12T00:00:00.000Z"),
      timezone: "Asia/Shanghai"
    }
  });
}

export function normalizeCoursePayload(input: unknown): CoursePayload {
  if (!input || typeof input !== "object") {
    throw new Error("课程数据不能为空。");
  }

  const data = input as Record<string, unknown>;
  const payload: CoursePayload = {
    userId: typeof data.userId === "string" && data.userId ? data.userId : demoUserId,
    semesterId:
      typeof data.semesterId === "string" && data.semesterId ? data.semesterId : demoSemesterId,
    name: requireString(data.name, "课程名"),
    teacher: optionalString(data.teacher),
    location: optionalString(data.location),
    weekday: Number(data.weekday),
    startTime: normalizeTime(data.startTime, "开始时间"),
    endTime: normalizeTime(data.endTime, "结束时间"),
    startWeek: Number(data.startWeek),
    endWeek: Number(data.endWeek),
    weekType: normalizeWeekType(data.weekType),
    color: optionalString(data.color) || "#13795b"
  };

  const validation = validateCourseInput(payload);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return payload;
}

export async function assertNoCourseConflict(
  payload: CoursePayload,
  options: { excludeCourseId?: string } = {}
) {
  const existingCourses = await prisma.course.findMany({
    where: {
      userId: payload.userId,
      semesterId: payload.semesterId
    }
  });
  const conflict = checkCourseConflict(payload, existingCourses.map(toCourseConflictCandidate), options);

  if (conflict.hasConflict) {
    throw new Error(conflict.error);
  }
}

export async function validateImportedCourses(
  courses: Array<Omit<CoursePayload, "userId" | "semesterId">>,
  userId = demoUserId,
  semesterId = demoSemesterId
): Promise<string[]> {
  const existingCourses = await prisma.course.findMany({
    where: { userId, semesterId }
  });
  const importedCourses = courses.map((course, index): CourseConflictCandidate => ({
    ...course,
    id: `import-${index}`,
    userId,
    semesterId
  }));

  return findCourseConflicts(importedCourses, existingCourses.map(toCourseConflictCandidate));
}

export function coursePayloadToPrismaData(payload: CoursePayload) {
  return {
    userId: payload.userId,
    semesterId: payload.semesterId,
    name: payload.name,
    teacher: payload.teacher,
    location: payload.location,
    weekday: payload.weekday,
    startTime: payload.startTime,
    endTime: payload.endTime,
    startWeek: payload.startWeek,
    endWeek: payload.endWeek,
    weekType: payload.weekType,
    color: payload.color
  };
}

export function toCourseDto(course: {
  id: string;
  userId: string;
  semesterId: string;
  name: string;
  teacher: string | null;
  location: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  weekType: CourseWeekType;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}): EditableCourse {
  return {
    id: course.id,
    userId: course.userId,
    semesterId: course.semesterId,
    name: course.name,
    teacher: course.teacher ?? "",
    location: course.location ?? "",
    weekday: course.weekday,
    startTime: course.startTime,
    endTime: course.endTime,
    startWeek: course.startWeek,
    endWeek: course.endWeek,
    weekType: course.weekType,
    color: course.color,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString()
  };
}

export async function readCsvText(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { csvText?: unknown };
    return typeof body.csvText === "string" ? body.csvText : "";
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const pastedText = formData.get("csvText");
    const file = formData.get("file");

    if (typeof pastedText === "string" && pastedText.trim()) {
      return pastedText;
    }

    if (file instanceof File) {
      return file.text();
    }

    return "";
  }

  return request.text();
}

function toCourseConflictCandidate(course: {
  id: string;
  userId: string;
  semesterId: string;
  name: string;
  teacher: string | null;
  location: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  weekType: CourseWeekType;
  color: string;
}): CourseConflictCandidate {
  return {
    id: course.id,
    userId: course.userId,
    semesterId: course.semesterId,
    name: course.name,
    teacher: course.teacher ?? "",
    location: course.location ?? "",
    weekday: course.weekday,
    startTime: course.startTime,
    endTime: course.endTime,
    startWeek: course.startWeek,
    endWeek: course.endWeek,
    weekType: course.weekType,
    color: course.color
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}不能为空。`);
  }

  return value.trim();
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTime(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label}格式错误，请使用 HH:mm。`);
  }

  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    throw new Error(`${label}格式错误，请使用 HH:mm。`);
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeWeekType(value: unknown): CourseWeekType {
  if (value === "all" || value === "odd" || value === "even") {
    return value;
  }

  throw new Error("单双周必须是 all、odd 或 even。");
}

