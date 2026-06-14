import { NextResponse } from "next/server";

import { toCourseDto } from "@/lib/courses/course-api";
import { formatDatabaseError } from "@/lib/database-error";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await assertDatabaseAvailable();
    await ensureDemoGoalUser();

    const today = new Date();
    const endDate = addDays(today, 6);
    const [scheduleBlocks, courses] = await Promise.all([
      prisma.scheduleBlock.findMany({
        where: {
          userId: demoGoalUserId,
          startTime: {
            gte: startOfDay(today),
            lte: endOfDay(endDate)
          }
        },
        include: {
          goal: true,
          task: true
        },
        orderBy: { startTime: "asc" }
      }),
      prisma.course.findMany({
        where: { userId: demoGoalUserId },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }]
      })
    ]);

    return NextResponse.json({
      scheduleBlocks: scheduleBlocks.map(toScheduleBlockDto),
      courses: courses.map(toCourseDto),
      unscheduledTasks: []
    });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "获取本周战斗路线失败，请稍后重试。") },
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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function endOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`);
}
