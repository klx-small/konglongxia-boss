import { NextResponse } from "next/server";

import {
  demoSemesterId,
  demoUserId,
  ensureDemoSemester,
  readCsvText,
  toCourseDto,
  validateImportedCourses
} from "@/lib/courses/course-api";
import { trackEvent } from "@/lib/analytics/track-event";
import { parseCourseCsv } from "@/lib/courses/course-csv";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const csvText = await readCsvText(request);
    const preview = parseCourseCsv(csvText);

    if (preview.errors.length > 0) {
      return NextResponse.json(preview, { status: 400 });
    }

    await ensureDemoSemester();
    const conflictErrors = await validateImportedCourses(preview.courses);

    if (conflictErrors.length > 0) {
      return NextResponse.json({ courses: [], errors: conflictErrors }, { status: 400 });
    }

    const savedCourses = await prisma.$transaction(
      preview.courses.map((course) =>
        prisma.course.create({
          data: {
            ...course,
            userId: demoUserId,
            semesterId: demoSemesterId
          }
        })
      )
    );
    await trackEvent({
      userId: demoUserId,
      eventName: "course_imported",
      entityType: "course",
      metadata: { count: savedCourses.length }
    });

    return NextResponse.json({ courses: savedCourses.map(toCourseDto), errors: [] });
  } catch (error) {
    return NextResponse.json(
      { courses: [], errors: [error instanceof Error ? error.message : "导入课程失败。"] },
      { status: 400 }
    );
  }
}
