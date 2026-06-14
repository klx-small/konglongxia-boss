import { NextResponse } from "next/server";

import {
  assertNoCourseConflict,
  coursePayloadToPrismaData,
  demoSemesterId,
  demoUserId,
  ensureDemoSemester,
  normalizeCoursePayload,
  toCourseDto
} from "@/lib/courses/course-api";
import { trackEvent } from "@/lib/analytics/track-event";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureDemoSemester();

    const courses = await prisma.course.findMany({
      where: {
        userId: demoUserId,
        semesterId: demoSemesterId
      },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
    });
    await trackEvent({
      userId: demoUserId,
      eventName: "free_slots_calculated",
      entityType: "course",
      metadata: { count: courses.length }
    });

    return NextResponse.json({ courses: courses.map(toCourseDto) });
  } catch {
    return NextResponse.json({ error: "获取课表失败，请稍后重试。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDemoSemester();
    const payload = normalizeCoursePayload(await request.json());
    await assertNoCourseConflict(payload);

    const course = await prisma.course.create({
      data: coursePayloadToPrismaData(payload)
    });
    await trackEvent({
      userId: demoUserId,
      eventName: "course_created",
      entityType: "course",
      entityId: course.id,
      metadata: { weekday: course.weekday }
    });

    return NextResponse.json({ course: toCourseDto(course) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败，请稍后重试。" },
      { status: 400 }
    );
  }
}
