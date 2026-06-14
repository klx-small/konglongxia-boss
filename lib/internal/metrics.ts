import { demoGoalUserId } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";

export type AiSourceStats = {
  mock: number;
  deepseek: number;
  fallback: number;
};

export type InternalMetricsStore = {
  countCourses: (userId: string) => Promise<number>;
  countGoals: (userId: string) => Promise<number>;
  countMilestones: (userId: string) => Promise<number>;
  countTasks: (userId: string) => Promise<number>;
  countScheduleBlocks: (userId: string) => Promise<number>;
  countCompletedTasks: (userId: string) => Promise<number>;
  countMissedBlocks: (userId: string) => Promise<number>;
  countRescueBlocks: (userId: string) => Promise<number>;
  countBattleLogs: (userId: string) => Promise<number>;
  countAnalyticsEvents: (userId: string) => Promise<number>;
  countTodayAnalyticsEvents: (userId: string, todayStart: Date, todayEnd: Date) => Promise<number>;
  countAiEventsBySource: (userId: string) => Promise<AiSourceStats>;
};

export async function buildInternalMetrics({
  store = prismaInternalMetricsStore,
  userId = demoGoalUserId,
  now = new Date()
}: {
  store?: InternalMetricsStore;
  userId?: string;
  now?: Date;
} = {}) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const [
    courseCount,
    goalCount,
    milestoneCount,
    taskCount,
    scheduleBlockCount,
    completedTaskCount,
    missedTaskCount,
    rescueBlockCount,
    battleLogCount,
    analyticsEventCount,
    todayAnalyticsEventCount,
    aiSourceStats
  ] = await Promise.all([
    store.countCourses(userId),
    store.countGoals(userId),
    store.countMilestones(userId),
    store.countTasks(userId),
    store.countScheduleBlocks(userId),
    store.countCompletedTasks(userId),
    store.countMissedBlocks(userId),
    store.countRescueBlocks(userId),
    store.countBattleLogs(userId),
    store.countAnalyticsEvents(userId),
    store.countTodayAnalyticsEvents(userId, todayStart, todayEnd),
    store.countAiEventsBySource(userId)
  ]);

  return {
    goalCount,
    courseCount,
    scheduleBlockCount,
    completedTaskCount,
    missedTaskCount,
    rescueBlockCount,
    battleLogCount,
    analyticsEventCount,
    todayAnalyticsEventCount,
    aiSourceStats,
    onboardingFunnel: {
      hasCourse: courseCount > 0,
      hasGoal: goalCount > 0,
      hasBattlePlan: milestoneCount > 0 && taskCount > 0,
      hasSchedule: scheduleBlockCount > 0,
      hasCompletedTask: completedTaskCount > 0
    }
  };
}

export const prismaInternalMetricsStore: InternalMetricsStore = {
  countCourses(userId) {
    return prisma.course.count({ where: { userId } });
  },
  countGoals(userId) {
    return prisma.goal.count({ where: { userId } });
  },
  countMilestones(userId) {
    return prisma.milestone.count({ where: { goal: { userId } } });
  },
  countTasks(userId) {
    return prisma.task.count({ where: { goal: { userId } } });
  },
  countScheduleBlocks(userId) {
    return prisma.scheduleBlock.count({ where: { userId } });
  },
  countCompletedTasks(userId) {
    return prisma.task.count({ where: { goal: { userId }, status: "completed" } });
  },
  countMissedBlocks(userId) {
    return prisma.scheduleBlock.count({ where: { userId, status: "missed" } });
  },
  countRescueBlocks(userId) {
    return prisma.scheduleBlock.count({ where: { userId, source: "reschedule" } });
  },
  countBattleLogs(userId) {
    return prisma.battleLog.count({ where: { userId } });
  },
  countAnalyticsEvents(userId) {
    return prisma.analyticsEvent.count({ where: { userId } });
  },
  countTodayAnalyticsEvents(userId, todayStart, todayEnd) {
    return prisma.analyticsEvent.count({
      where: {
        userId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });
  },
  async countAiEventsBySource(userId) {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        OR: [{ entityType: "ai" }, { eventName: "battle_plan_generated" }]
      },
      select: {
        eventName: true,
        metadata: true
      }
    });
    const stats: AiSourceStats = { mock: 0, deepseek: 0, fallback: 0 };

    for (const event of events) {
      const source = readSource(event.metadata);

      if (source === "mock" || source === "deepseek" || source === "fallback") {
        stats[source] += 1;
      } else if (event.eventName === "ai_deepseek_success") {
        stats.deepseek += 1;
      } else if (event.eventName === "ai_fallback_used" || event.eventName === "ai_deepseek_failed") {
        stats.fallback += 1;
      }
    }

    return stats;
  }
};

export function isInternalAccessAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_INTERNAL_TOOLS === "true";
}

function readSource(metadata: unknown): string {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? String((metadata as { source?: unknown }).source ?? "")
    : "";
}

function startOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function endOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`);
}
