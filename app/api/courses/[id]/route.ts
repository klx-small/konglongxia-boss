import { NextResponse } from "next/server";

import {
  assertNoCourseConflict,
  coursePayloadToPrismaData,
  ensureDemoSemester,
  normalizeCoursePayload,
  toCourseDto
} from "@/lib/courses/course-api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    await ensureDemoSemester();
    const { id } = await context.params;
    const payload = normalizeCoursePayload(await request.json());
    await assertNoCourseConflict(payload, { excludeCourseId: id });

    const course = await prisma.course.update({
      where: { id },
      data: coursePayloadToPrismaData(payload)
    });

    return NextResponse.json({ course: toCourseDto(course) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败，请稍后重试。" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除失败，请稍后重试。" }, { status: 400 });
  }
}

