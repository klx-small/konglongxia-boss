import { NextResponse } from "next/server";

import { parseCourseCsv } from "@/lib/courses/course-csv";
import { readCsvText } from "@/lib/courses/course-api";

export async function POST(request: Request) {
  const csvText = await readCsvText(request);

  return NextResponse.json(parseCourseCsv(csvText));
}

