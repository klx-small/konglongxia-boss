import { NextResponse } from "next/server";

import {
  demoGoalUserId,
  ensureDemoGoalUser,
  goalPayloadToPrismaData,
  normalizeGoalPayload,
  toGoalDto
} from "@/lib/goals/goal-api";
import { trackEvent } from "@/lib/analytics/track-event";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { formatDatabaseError } from "@/lib/database-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();

    const goals = await prisma.goal.findMany({
      where: { userId: demoGoalUserId },
      include: {
        milestones: { orderBy: { order: "asc" } },
        tasks: { orderBy: [{ deadline: "asc" }, { priority: "desc" }] }
      },
      orderBy: [{ status: "asc" }, { deadline: "asc" }]
    });

    return NextResponse.json({ goals: goals.map(toGoalDto) });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "获取 Boss 目标失败，请稍后重试。") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();
    const payload = normalizeGoalPayload(await request.json());

    const goal = await prisma.goal.create({
      data: goalPayloadToPrismaData(payload)
    });
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "goal_created",
      entityType: "goal",
      entityId: goal.id,
      metadata: { goalType: goal.goalType, intensity: goal.intensity }
    });

    return NextResponse.json({ goal: toGoalDto(goal) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存目标失败，请稍后重试。" },
      { status: 400 }
    );
  }
}
