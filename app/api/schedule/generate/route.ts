import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { formatDatabaseError } from "@/lib/database-error";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";
import { buildDateRange, buildFreeSlots, formatDateOnly } from "@/lib/scheduler/schedule-api";
import { scheduleTasks } from "@/lib/scheduler/scheduleTasks";
import { splitTasks } from "@/lib/scheduler/splitTasks";

type GenerateScheduleRequest = {
  goalId?: string;
};

export async function POST(request: Request) {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();

    const body = (await request.json()) as GenerateScheduleRequest;
    const goalId = body.goalId;

    if (!goalId) {
      return NextResponse.json({ error: "缺少 Boss 目标 ID。" }, { status: 400 });
    }

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: demoGoalUserId }
    });

    if (!goal) {
      return NextResponse.json({ error: "没有找到这个 Boss 目标。" }, { status: 404 });
    }

    const tasks = await prisma.task.findMany({
      where: { goalId, status: { in: ["pending", "scheduled"] } },
      orderBy: [{ deadline: "asc" }, { priority: "desc" }]
    });

    const today = new Date();
    const dateRange = buildDateRange(today, 7);
    const courses = await prisma.course.findMany({
      where: { userId: demoGoalUserId }
    });
    const freeSlots = buildFreeSlots({ courses, dateRange });

    const segments = splitTasks(
      tasks.map((task) => ({
        id: task.id,
        goalId: task.goalId,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        difficulty: task.difficulty,
        priority: task.priority,
        deadline: formatDateOnly(task.deadline),
        taskType: task.taskType,
        xpReward: task.xpReward
      }))
    );

    const result = scheduleTasks({
      tasks: segments,
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: goal.dailyAvailableMinutes },
      dateRange
    });

    const savedBlocks = await prisma.$transaction(async (tx) => {
      await tx.scheduleBlock.deleteMany({
        where: {
          goalId,
          status: { in: ["scheduled", "missed", "rescheduled", "cancelled"] }
        }
      });

      const blocks = [];

      for (const block of result.scheduleBlocks) {
        const originalTaskId = block.taskId.split("#")[0];
        blocks.push(
          await tx.scheduleBlock.create({
            data: {
              userId: demoGoalUserId,
              goalId,
              taskId: originalTaskId,
              startTime: new Date(block.startTime),
              endTime: new Date(block.endTime),
              status: "scheduled",
              source: "auto"
            },
            include: {
              goal: true,
              task: true
            }
          })
        );
      }

      const scheduledTaskIds = [...new Set(result.scheduleBlocks.map((block) => block.taskId.split("#")[0]))];

      if (scheduledTaskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: scheduledTaskIds } },
          data: { status: "scheduled" }
        });
      }

      return blocks;
    });
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "schedule_generated",
      entityType: "schedule",
      entityId: goalId,
      metadata: {
        blockCount: savedBlocks.length,
        unscheduledCount: result.unscheduledTasks.length
      }
    });

    return NextResponse.json({
      scheduleBlocks: savedBlocks.map(toScheduleBlockDto),
      unscheduledTasks: result.unscheduledTasks,
      message: "本周战斗路线已生成"
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "生成失败，请稍后重试") },
      { status: 500 }
    );
  }
}

function toScheduleBlockDto(block: {
  id: string;
  userId: string;
  goalId: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "completed" | "missed" | "rescheduled" | "cancelled";
  source: "auto" | "manual" | "reschedule";
  createdAt: Date;
  updatedAt: Date;
  goal: { title: string; bossName: string };
  task: { title: string; taskType: string; xpReward: number };
}) {
  return {
    id: block.id,
    userId: block.userId,
    goalId: block.goalId,
    taskId: block.taskId,
    startTime: block.startTime.toISOString(),
    endTime: block.endTime.toISOString(),
    status: block.status,
    source: block.source,
    goalTitle: block.goal.title,
    bossName: block.goal.bossName,
    taskTitle: block.task.title,
    taskType: block.task.taskType,
    xpReward: block.task.xpReward,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString()
  };
}
