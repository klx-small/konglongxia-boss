import { NextResponse } from "next/server";

import { demoGoalUserId } from "@/lib/goals/goal-api";
import { isInternalAccessAllowed } from "@/lib/internal/metrics";
import { prisma } from "@/lib/prisma";

type ExportFeedbackRecord = {
  id: string;
  userId: string;
  type: string;
  page: string | null;
  content: string;
  contact: string | null;
  rating: number | null;
  createdAt: Date;
};

export async function GET(request: Request) {
  return handleFeedbackExportGet(request);
}

export async function handleFeedbackExportGet(
  _request: Request,
  deps: {
    findFeedback?: () => Promise<ExportFeedbackRecord[]>;
  } = {}
) {
  if (!isInternalAccessAllowed()) {
    return NextResponse.json({ error: "反馈导出不可用。" }, { status: 404 });
  }

  const feedback = await (deps.findFeedback ?? findFeedbackForExport)();
  const csv = toFeedbackCsv(feedback);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="feedback-export.csv"'
    }
  });
}

async function findFeedbackForExport(): Promise<ExportFeedbackRecord[]> {
  return prisma.feedback.findMany({
    where: {
      userId: demoGoalUserId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

function toFeedbackCsv(feedback: ExportFeedbackRecord[]): string {
  const header = ["createdAt", "type", "rating", "page", "content", "hasContact"];
  const rows = feedback.map((item) => [
    item.createdAt.toISOString(),
    item.type,
    item.rating ?? "",
    item.page ?? "",
    item.content,
    Boolean(item.contact)
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number | boolean): string {
  const text = String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
