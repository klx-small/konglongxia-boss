import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { calculateBossHeal } from "@/lib/battle/calculateBossHeal";
import { detectMissedScheduleBlocks } from "@/lib/battle/detectMissedScheduleBlocks";
import { formatDatabaseError } from "@/lib/database-error";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();

    const candidates = await prisma.scheduleBlock.findMany({
      where: {
        userId: demoGoalUserId,
        status: "scheduled",
        endTime: {
          lt: new Date()
        }
      },
      include: {
        goal: true,
        task: true,
        battleLogs: {
          where: {
            actionType: "boss_heal"
          }
        }
      },
      orderBy: {
        endTime: "asc"
      }
    });
    const detection = detectMissedScheduleBlocks({
      now: new Date(),
      scheduleBlocks: candidates.map((block) => ({
        ...block,
        taskStatus: block.task.status
      }))
    });

    const missedBlocks = await prisma.$transaction(async (tx) => {
      const processedBlocks = [];

      for (const block of detection.missedBlocks) {
        const alreadyHealed = block.battleLogs.length > 0;
        const heal = calculateBossHeal({
          task: block.task,
          bossHp: block.goal.bossHp,
          bossMaxHp: block.goal.bossMaxHp,
          alreadyHealed
        });

        await tx.scheduleBlock.update({
          where: {
            id: block.id
          },
          data: {
            status: "missed"
          }
        });
        await tx.task.update({
          where: {
            id: block.taskId
          },
          data: {
            status: "overdue"
          }
        });

        if (!alreadyHealed) {
          await tx.goal.update({
            where: {
              id: block.goalId
            },
            data: {
              bossHp: heal.nextBossHp
            }
          });
          await tx.battleLog.create({
            data: {
              userId: block.userId,
              goalId: block.goalId,
              taskId: block.taskId,
              scheduleBlockId: block.id,
              actionType: "boss_heal",
              amount: heal.healAmount,
              message: heal.message
            }
          });
        }

        processedBlocks.push({
          id: block.id,
          taskId: block.taskId,
          goalId: block.goalId,
          taskTitle: block.task.title,
          bossName: block.goal.bossName,
          healAmount: heal.healAmount,
          message: heal.message,
          endTime: block.endTime.toISOString()
        });
      }

      return processedBlocks;
    });
    await Promise.all(
      missedBlocks.flatMap((block) => [
        trackEvent({
          userId: demoGoalUserId,
          eventName: "task_missed",
          entityType: "task",
          entityId: block.taskId,
          metadata: { status: "missed" }
        }),
        ...(block.healAmount > 0
          ? [
              trackEvent({
                userId: demoGoalUserId,
                eventName: "boss_healed",
                entityType: "battle",
                entityId: block.goalId,
                metadata: { count: 1, healAmount: block.healAmount }
              })
            ]
          : [])
      ])
    );

    return NextResponse.json({ missedBlocks });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "检测错过副本失败，请稍后重试。") },
      { status: 500 }
    );
  }
}
