import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { applyBossDamage, applyXpReward, calculateQuestBattleReward } from "@/lib/battle/rewards";
import { getTodayBattleData } from "@/lib/battle/today-api";
import { formatDatabaseError } from "@/lib/database-error";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
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
    const block = await prisma.scheduleBlock.findFirst({
      where: {
        id,
        userId: demoGoalUserId
      },
      include: {
        goal: true,
        task: true
      }
    });

    if (!block) {
      return NextResponse.json({ error: "没有找到这个今日副本。" }, { status: 404 });
    }

    if (block.status !== "completed" && block.task.status !== "completed") {
      const estimatedMinutes = Math.max(
        0,
        Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60_000)
      );
      const reward = calculateQuestBattleReward({
        estimatedMinutes,
        difficulty: block.task.difficulty,
        taskType: block.task.taskType,
        xpReward: block.task.xpReward
      });
      const bossDamage = applyBossDamage({
        currentHp: block.goal.bossHp,
        maxHp: block.goal.bossMaxHp,
        damage: reward.damage
      });

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: {
            id: demoGoalUserId
          }
        });
        const xpProgress = applyXpReward({
          currentTotalXp: user.xp,
          xpReward: reward.xpReward
        });

        await tx.scheduleBlock.update({
          where: {
            id
          },
          data: {
            status: "completed"
          }
        });
        await tx.task.update({
          where: {
            id: block.taskId
          },
          data: {
            status: "completed"
          }
        });
        await tx.goal.update({
          where: {
            id: block.goalId
          },
          data: {
            bossHp: bossDamage.nextHp,
            status: bossDamage.isDefeated ? "completed" : block.goal.status
          }
        });
        await tx.user.update({
          where: {
            id: demoGoalUserId
          },
          data: {
            xp: xpProgress.totalXp,
            level: xpProgress.level
          }
        });
      });
      await trackEvent({
        userId: demoGoalUserId,
        eventName: "task_completed",
        entityType: "task",
        entityId: block.taskId,
        metadata: {
          taskType: block.task.taskType,
          xp: reward.xpReward,
          bossDamage: reward.damage
        }
      });
    }

    return NextResponse.json(await getTodayBattleData());
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "完成副本失败，请稍后重试。") },
      { status: 500 }
    );
  }
}
