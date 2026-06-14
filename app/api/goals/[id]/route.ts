import { NextResponse } from "next/server";

import {
  demoGoalUserId,
  ensureDemoGoalUser,
  goalPayloadToPrismaData,
  normalizeGoalPayload,
  toGoalDto
} from "@/lib/goals/goal-api";
import { trackEvent } from "@/lib/analytics/track-event";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureDemoGoalUser();
    const { id } = await context.params;
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: demoGoalUserId
      },
      include: {
        milestones: {
          orderBy: { order: "asc" }
        },
        tasks: {
          orderBy: [{ deadline: "asc" }, { priority: "desc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!goal) {
      return NextResponse.json({ error: "没有找到这个 Boss 目标。" }, { status: 404 });
    }

    await trackEvent({
      userId: demoGoalUserId,
      eventName: "boss_viewed",
      entityType: "goal",
      entityId: goal.id
    });

    return NextResponse.json({ goal: toGoalDto(goal) });
  } catch {
    return NextResponse.json({ error: "获取 Boss 目标失败，请稍后重试。" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await ensureDemoGoalUser();
    const { id } = await context.params;
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: demoGoalUserId
      }
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "没有找到这个 Boss 目标。" }, { status: 404 });
    }

    const payload = normalizeGoalPayload(await request.json(), existingGoal.status);
    const goal = await prisma.goal.update({
      where: { id },
      data: goalPayloadToPrismaData(payload)
    });

    return NextResponse.json({ goal: toGoalDto(goal) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存目标失败，请稍后重试。" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureDemoGoalUser();
    const { id } = await context.params;
    const result = await prisma.goal.deleteMany({
      where: {
        id,
        userId: demoGoalUserId
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "没有找到这个 Boss 目标。" }, { status: 404 });
    }
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "goal_deleted",
      entityType: "goal",
      entityId: id
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除 Boss 目标失败，请稍后重试。" }, { status: 400 });
  }
}
