import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { formatDatabaseError } from "@/lib/database-error";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";
import { addDays, buildDateRange, buildFreeSlots, formatDateOnly } from "@/lib/scheduler/schedule-api";
import { planRescueSchedule, type RescheduleMode } from "@/lib/scheduler/rescheduleTasks";
import type { ScheduleBlockStatus, TaskStatus } from "@/lib/types";

type RescheduleRequest = {
  goalId?: string;
  taskIds?: string[];
  mode?: RescheduleMode;
};

export async function POST(request: Request) {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();

    const body = normalizeRequestBody(await readRequestBody(request));
    const validationError = validateRequestBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const now = new Date();
    const dateRange = buildDateRange(addDays(now, 1), 7);
    const dateRangeStart = new Date(`${dateRange.startDate}T00:00:00.000Z`);
    const tasks = await prisma.task.findMany({
      where: buildTaskWhere(body),
      include: {
        goal: true,
        scheduleBlocks: {
          where: {
            status: {
              in: ["missed", "rescheduled"]
            }
          },
          select: {
            id: true
          }
        }
      },
      orderBy: [{ deadline: "asc" }, { priority: "desc" }]
    });
    const selectedTaskIds = [...new Set(tasks.map((task) => task.id))];

    if (selectedTaskIds.length === 0) {
      return NextResponse.json({
        rescueBlocks: [],
        movedBlocks: [],
        unchangedBlocks: [],
        unscheduledTasks: [],
        message: "暂时没有需要补救的副本。"
      });
    }

    const [courses, existingBlocks] = await Promise.all([
      prisma.course.findMany({
        where: {
          userId: demoGoalUserId
        }
      }),
      prisma.scheduleBlock.findMany({
        where: {
          userId: demoGoalUserId,
          taskId: {
            notIn: selectedTaskIds
          },
          startTime: {
            gte: dateRangeStart
          },
          status: {
            in: ["scheduled", "completed", "rescheduled"]
          }
        },
        include: {
          goal: true,
          task: true
        },
        orderBy: {
          startTime: "asc"
        }
      })
    ]);
    const freeSlots = buildFreeSlots({ courses, dateRange });
    const result = planRescueSchedule({
      mode: body.mode,
      goalId: body.goalId,
      taskIds: body.taskIds,
      tasks: tasks.map((task) => ({
        id: task.id,
        goalId: task.goalId,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        difficulty: task.difficulty,
        priority: task.priority,
        deadline: formatDateOnly(task.deadline),
        taskType: task.taskType,
        xpReward: task.xpReward,
        status: task.status === "scheduled" && task.scheduleBlocks.length > 0 ? "overdue" : task.status
      })),
      existingBlocks: existingBlocks.map((block) => ({
        id: block.id,
        taskId: block.taskId,
        goalId: block.goalId,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        status: block.status,
        priority: block.task.priority,
        deadline: formatDateOnly(block.task.deadline)
      })),
      freeSlots,
      userPreferences: {
        dailyStudyLimitMinutes: tasks.reduce(
          (limit, task) => Math.max(limit, task.goal.dailyAvailableMinutes),
          120
        )
      },
      dateRange
    });

    const existingBlockById = new Map(existingBlocks.map((block) => [block.id, block]));
    const savedBlocks = await prisma.$transaction(async (tx) => {
      if (selectedTaskIds.length > 0) {
        await tx.scheduleBlock.updateMany({
          where: {
            userId: demoGoalUserId,
            taskId: {
              in: selectedTaskIds
            },
            status: "missed"
          },
          data: {
            status: "rescheduled"
          }
        });
        await tx.scheduleBlock.deleteMany({
          where: {
            userId: demoGoalUserId,
            taskId: {
              in: selectedTaskIds
            },
            startTime: {
              gte: dateRangeStart
            },
            status: {
              in: ["scheduled", "rescheduled", "cancelled"]
            }
          }
        });
      }

      const movedBlockIds = result.movedBlocks.map((block) => block.id);

      if (movedBlockIds.length > 0) {
        await tx.scheduleBlock.updateMany({
          where: {
            userId: demoGoalUserId,
            id: {
              in: movedBlockIds
            },
            status: "scheduled"
          },
          data: {
            status: "rescheduled"
          }
        });
        await tx.task.updateMany({
          where: {
            id: {
              in: result.movedBlocks.map((block) => block.taskId)
            },
            status: {
              not: "completed"
            }
          },
          data: {
            status: "pending"
          }
        });
      }

      const blocks = [];

      for (const block of result.rescueBlocks) {
        blocks.push(
          await tx.scheduleBlock.create({
            data: {
              userId: demoGoalUserId,
              goalId: block.goalId,
              taskId: block.taskId,
              startTime: new Date(block.startTime),
              endTime: new Date(block.endTime),
              status: "scheduled",
              source: "reschedule"
            },
            include: {
              goal: true,
              task: true
            }
          })
        );
      }

      const scheduledTaskIds = [...new Set(result.rescueBlocks.map((block) => block.taskId))];

      if (scheduledTaskIds.length > 0) {
        await tx.task.updateMany({
          where: {
            id: {
              in: scheduledTaskIds
            },
            status: {
              not: "completed"
            }
          },
          data: {
            status: "scheduled"
          }
        });
      }

      if (blocks.length > 0) {
        await tx.battleLog.createMany({
          data: blocks.map((block) => ({
            userId: block.userId,
            goalId: block.goalId,
            taskId: block.taskId,
            scheduleBlockId: block.id,
            actionType: "rescue_schedule" as const,
            amount: 0,
            message: `补救副本已安排到 ${formatRescueTime(block.startTime)}。`
          })),
          skipDuplicates: true
        });
      }

      return blocks;
    });
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "rescue_generated",
      entityType: "schedule",
      entityId: body.goalId,
      metadata: {
        rescueCount: savedBlocks.length,
        movedCount: result.movedBlocks.length,
        unscheduledCount: result.unscheduledTasks.length
      }
    });

    return NextResponse.json({
      rescueBlocks: savedBlocks.map(toScheduleBlockDto),
      movedBlocks: result.movedBlocks.map((block) =>
        toScheduleBlockDtoWithStatus(existingBlockById.get(block.id), "rescheduled")
      ),
      unchangedBlocks: result.unchangedBlocks
        .map((block) => toScheduleBlockDtoWithStatus(existingBlockById.get(block.id), block.status))
        .filter(Boolean),
      unscheduledTasks: result.unscheduledTasks,
      message:
        body.mode === "tasks"
          ? "恐龙侠已为这个小怪安排补救副本。"
          : "恐龙侠已重新规划战线，补救副本已生成。"
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "生成补救副本失败，请稍后重试。") },
      { status: 500 }
    );
  }
}

async function readRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeRequestBody(input: unknown): RescheduleRequest {
  if (!input || typeof input !== "object") {
    return { mode: "all", taskIds: [] };
  }

  const data = input as Record<string, unknown>;
  const mode = data.mode === "goal" || data.mode === "tasks" || data.mode === "all" ? data.mode : "all";

  return {
    mode,
    goalId: typeof data.goalId === "string" ? data.goalId : undefined,
    taskIds: Array.isArray(data.taskIds)
      ? [...new Set(data.taskIds.filter((taskId): taskId is string => typeof taskId === "string" && taskId.length > 0))]
      : []
  };
}

function validateRequestBody(body: RescheduleRequest): string {
  if (body.mode === "goal" && !body.goalId) {
    return "缺少需要补救的 Boss 目标 ID。";
  }

  if (body.mode === "tasks" && (!body.taskIds || body.taskIds.length === 0)) {
    return "缺少需要补救的小怪任务。";
  }

  return "";
}

function buildTaskWhere(body: RescheduleRequest) {
  const inactiveStatuses: TaskStatus[] = ["completed", "skipped"];
  const rescueStatuses: TaskStatus[] = ["pending", "overdue"];
  const rescueBlockStatuses: ScheduleBlockStatus[] = ["missed", "rescheduled"];

  return {
    goal: {
      userId: demoGoalUserId,
      ...(body.mode === "goal" ? { id: body.goalId } : {})
    },
    status: {
      notIn: inactiveStatuses
    },
    ...(body.mode === "tasks"
      ? {
          id: {
            in: body.taskIds ?? []
          }
        }
      : {
          OR: [
            {
              status: {
                in: rescueStatuses
              }
            },
            {
              scheduleBlocks: {
                some: {
                  status: {
                    in: rescueBlockStatuses
                  }
                }
              }
            }
          ]
        })
  };
}

function toScheduleBlockDtoWithStatus(
  block:
    | {
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
      }
    | undefined,
  status: "scheduled" | "completed" | "missed" | "rescheduled" | "cancelled"
) {
  if (!block) {
    return null;
  }

  return toScheduleBlockDto({
    ...block,
    status
  });
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
    taskType: block.source === "reschedule" ? "rescue_dungeon" : block.task.taskType,
    xpReward: block.task.xpReward,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString()
  };
}

function formatRescueTime(startTime: Date): string {
  return `${startTime.toISOString().slice(0, 10)} ${startTime.toISOString().slice(11, 16)}`;
}
