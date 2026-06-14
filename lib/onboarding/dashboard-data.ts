import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";
import type { DashboardSnapshot } from "@/lib/onboarding/status";
import { prisma } from "@/lib/prisma";

export async function loadDashboardSnapshot(now = new Date()): Promise<DashboardSnapshot> {
  await ensureDemoGoalUser();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const firstGoal = await prisma.goal.findFirst({
    where: { userId: demoGoalUserId },
    orderBy: [{ status: "asc" }, { deadline: "asc" }]
  });
  const [courseCount, goalCount, milestoneCount, taskCount, scheduleBlockCount, todayQuestCount, completedQuestCount] =
    await Promise.all([
      prisma.course.count({ where: { userId: demoGoalUserId } }),
      prisma.goal.count({ where: { userId: demoGoalUserId } }),
      prisma.milestone.count({ where: { goal: { userId: demoGoalUserId } } }),
      prisma.task.count({ where: { goal: { userId: demoGoalUserId } } }),
      prisma.scheduleBlock.count({ where: { userId: demoGoalUserId, status: { not: "cancelled" } } }),
      prisma.scheduleBlock.count({
        where: {
          userId: demoGoalUserId,
          status: { not: "cancelled" },
          startTime: { gte: todayStart, lte: todayEnd }
        }
      }),
      prisma.scheduleBlock.count({ where: { userId: demoGoalUserId, status: "completed" } })
    ]);

  return {
    courseCount,
    goalCount,
    milestoneCount,
    taskCount,
    scheduleBlockCount,
    todayQuestCount,
    completedQuestCount,
    firstGoalId: firstGoal?.id
  };
}

function startOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function endOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`);
}
