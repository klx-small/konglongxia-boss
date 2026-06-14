import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { decomposeGoal } from "@/lib/ai/decompose-goal";
import { demoGoalUserId, ensureDemoGoalUser, toGoalDto } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await ensureDemoGoalUser();
    const { id } = await context.params;
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: demoGoalUserId
      }
    });

    if (!goal) {
      return NextResponse.json({ error: "没有找到这个 Boss 目标。" }, { status: 404 });
    }

    const campaign = await decomposeGoal(toGoalDto(goal));

    const savedGoal = await prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({ where: { goalId: id } });
      await tx.milestone.deleteMany({ where: { goalId: id } });

      const milestoneIdByOrder = new Map<number, string>();

      for (const milestone of campaign.milestones) {
        const savedMilestone = await tx.milestone.create({
          data: {
            goalId: id,
            title: milestone.title,
            description: milestone.description,
            order: milestone.order,
            dueDate: parseDateOnly(milestone.dueDate),
            status: milestone.status
          }
        });

        milestoneIdByOrder.set(milestone.order, savedMilestone.id);
      }

      await tx.task.createMany({
        data: campaign.tasks.map((task) => {
          const milestoneId = milestoneIdByOrder.get(task.milestoneOrder);

          if (!milestoneId) {
            throw new Error("战役阶段生成失败，请稍后重试。");
          }

          return {
            goalId: id,
            milestoneId,
            title: task.title,
            description: task.description,
            estimatedMinutes: task.estimatedMinutes,
            difficulty: task.difficulty,
            priority: task.priority,
            deadline: parseDateOnly(task.deadline),
            taskType: task.taskType,
            xpReward: task.xpReward,
            status: task.status
          };
        })
      });

      return tx.goal.findFirstOrThrow({
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
    });
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "battle_plan_generated",
      entityType: "goal",
      entityId: id,
      metadata: {
        source: campaign.source,
        milestoneCount: campaign.milestones.length,
        taskCount: campaign.tasks.length
      }
    });

    return NextResponse.json({
      goal: toGoalDto(savedGoal),
      source: campaign.source,
      fallbackReason: campaign.fallbackReason,
      message: getCampaignMessage(campaign.source)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成战役失败，请稍后重试。" },
      { status: 400 }
    );
  }
}

function getCampaignMessage(source: "mock" | "deepseek" | "fallback"): string {
  if (source === "deepseek") {
    return "DeepSeek 已为你生成 Boss 战役。";
  }

  if (source === "fallback") {
    return "AI 暂时不可用，恐龙侠已使用本地模板生成战役。";
  }

  return "恐龙侠已使用本地模板生成战役。";
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
