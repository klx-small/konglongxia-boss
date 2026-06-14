import type { Prisma } from "@prisma/client";

import { demoGoalUserId } from "@/lib/goals/goal-api";
import { isInternalAccessAllowed } from "@/lib/internal/metrics";
import { prisma } from "@/lib/prisma";

export type InternalAnalyticsEvent = {
  id: string;
  userId: string;
  eventName: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type InternalAnalyticsFeedback = {
  id: string;
  type: string;
  page: string | null;
  content: string;
  contact: string | null;
  rating: number | null;
  createdAt: Date;
};

export type InternalAnalyticsStore = {
  findEvents: (options: {
    userId?: string | null;
    from: Date;
    to: Date;
    eventName?: string;
  }) => Promise<InternalAnalyticsEvent[]>;
  findFeedback: (options: {
    userId?: string | null;
    from: Date;
    to: Date;
    take?: number;
  }) => Promise<InternalAnalyticsFeedback[]>;
};

export type BuildInternalAnalyticsOptions = {
  store?: InternalAnalyticsStore;
  userId?: string;
  now?: Date;
  days?: number;
  eventName?: string;
};

const funnelEventNames = {
  courseCreated: ["course_created", "course_imported"],
  goalCreated: ["goal_created"],
  battlePlanGenerated: ["battle_plan_generated"],
  scheduleGenerated: ["schedule_generated"],
  todayBattleViewed: ["today_battle_viewed"],
  taskCompleted: ["task_completed"]
} as const;

export async function buildInternalAnalytics({
  store = prismaInternalAnalyticsStore,
  userId = demoGoalUserId,
  now = new Date(),
  days = 7,
  eventName
}: BuildInternalAnalyticsOptions = {}) {
  const normalizedDays = normalizeDays(days);
  const from = startOfDay(addDays(now, -(normalizedDays - 1)));
  const to = endOfDay(now);
  const [events, feedback] = await Promise.all([
    store.findEvents({ userId, from, to, eventName }),
    store.findFeedback({ userId, from, to })
  ]);
  const funnel = buildFunnel(events);
  const ai = buildAiStats(events);
  const battle = buildBattleStats(events);
  const dailyComparison = buildDailyComparison(events, feedback, now);

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString()
    },
    funnel,
    ai,
    battle,
    feedbackCount: feedback.length,
    dailyComparison,
    userStats: buildUserStats(events),
    anomalies: buildAnomalies(events, feedback),
    eventsByDay: buildEventsByDay(events),
    topEvents: buildTopEvents(events),
    recentEvents: events
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)
      .map((event) => ({
        id: event.id,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId,
        createdAt: event.createdAt.toISOString()
      })),
    recentFeedback: feedback
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        type: item.type,
        page: item.page,
        content: truncate(item.content, 100),
        contactFilled: Boolean(item.contact),
        rating: item.rating,
        createdAt: item.createdAt.toISOString()
      }))
  };
}

export const prismaInternalAnalyticsStore: InternalAnalyticsStore = {
  findEvents({ userId, from, to, eventName }) {
    return prisma.analyticsEvent.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(eventName ? { eventName } : {}),
        createdAt: {
          gte: from,
          lte: to
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  },
  findFeedback({ userId, from, to, take }) {
    return prisma.feedback.findMany({
      where: {
        ...(userId ? { userId } : {}),
        createdAt: {
          gte: from,
          lte: to
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      ...(take ? { take } : {})
    });
  }
};

export { isInternalAccessAllowed };

function buildFunnel(events: InternalAnalyticsEvent[]) {
  return {
    courseCreated: countAny(events, funnelEventNames.courseCreated),
    goalCreated: countAny(events, funnelEventNames.goalCreated),
    battlePlanGenerated: countAny(events, funnelEventNames.battlePlanGenerated),
    scheduleGenerated: countAny(events, funnelEventNames.scheduleGenerated),
    todayBattleViewed: countAny(events, funnelEventNames.todayBattleViewed),
    taskCompleted: countAny(events, funnelEventNames.taskCompleted)
  };
}

function buildAiStats(events: InternalAnalyticsEvent[]) {
  let mock = 0;
  let deepseek = 0;
  let fallback = 0;
  let deepseekFailed = 0;

  for (const event of events) {
    const source = readMetadataString(event.metadata, "source");

    if (source === "mock") {
      mock += 1;
    } else if (source === "deepseek" && event.eventName !== "ai_deepseek_failed") {
      deepseek += 1;
    } else if (source === "fallback") {
      fallback += 1;
    } else if (event.eventName === "ai_deepseek_success") {
      deepseek += 1;
    } else if (event.eventName === "ai_fallback_used") {
      fallback += 1;
    }

    if (event.eventName === "ai_deepseek_failed") {
      deepseekFailed += 1;
    }
  }

  return {
    mock,
    deepseek,
    fallback,
    deepseekFailed,
    fallbackRate: percent(fallback, deepseek + fallback)
  };
}

function buildBattleStats(events: InternalAnalyticsEvent[]) {
  const taskCompleted = count(events, "task_completed");
  const taskMissed = count(events, "task_missed");
  const bossHealed = count(events, "boss_healed");
  const rescueGenerated = count(events, "rescue_generated");

  return {
    taskCompleted,
    taskMissed,
    bossHealed,
    rescueGenerated,
    rescueUsageRate: percent(rescueGenerated, taskMissed)
  };
}

function buildUserStats(events: InternalAnalyticsEvent[]) {
  const byUser = new Map<string, InternalAnalyticsEvent[]>();

  for (const event of events) {
    const userEvents = byUser.get(event.userId) ?? [];
    userEvents.push(event);
    byUser.set(event.userId, userEvents);
  }

  return [...byUser.entries()]
    .map(([userId, userEvents]) => {
      const sorted = userEvents.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        userId,
        eventCount: userEvents.length,
        hasCourse: countAny(userEvents, funnelEventNames.courseCreated) > 0,
        hasGoal: countAny(userEvents, funnelEventNames.goalCreated) > 0,
        hasBattlePlan: countAny(userEvents, funnelEventNames.battlePlanGenerated) > 0,
        hasSchedule: countAny(userEvents, funnelEventNames.scheduleGenerated) > 0,
        hasViewedTodayBattle: countAny(userEvents, funnelEventNames.todayBattleViewed) > 0,
        hasCompletedTask: countAny(userEvents, funnelEventNames.taskCompleted) > 0,
        hasSubmittedFeedback: count(userEvents, "feedback_submitted") > 0,
        lastActiveAt: sorted[0]?.createdAt.toISOString() ?? ""
      };
    })
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

function buildAnomalies(events: InternalAnalyticsEvent[], feedback: InternalAnalyticsFeedback[]) {
  const anomalies: Array<{
    type: string;
    title: string;
    description: string;
    count: number;
    severity: "low" | "medium" | "high";
  }> = [];
  const fallbackUsed = count(events, "ai_fallback_used");
  const deepseekFailed = count(events, "ai_deepseek_failed");
  const taskMissed = count(events, "task_missed");
  const taskCompleted = count(events, "task_completed");
  const bugFeedback = feedback.filter((item) => item.type === "bug").length;
  const scheduleWithUnscheduled = events.filter(
    (event) => event.eventName === "schedule_generated" && readMetadataNumber(event.metadata, "unscheduledCount") > 0
  ).length;

  if (fallbackUsed > 0) {
    anomalies.push({
      type: "ai_fallback_used",
      title: "AI 使用了 fallback",
      description: "有战役生成退回到了备用方案，建议检查 DeepSeek 稳定性或输出格式。",
      count: fallbackUsed,
      severity: "medium"
    });
  }

  if (deepseekFailed > 0) {
    anomalies.push({
      type: "ai_deepseek_failed",
      title: "DeepSeek 调用失败",
      description: "内测中出现 DeepSeek 失败事件，优先检查密钥、网络和服务端错误。",
      count: deepseekFailed,
      severity: "high"
    });
  }

  if (taskMissed > taskCompleted) {
    anomalies.push({
      type: "task_missed_gt_completed",
      title: "错过任务多于完成任务",
      description: "missed 数高于完成数，可能说明任务安排偏重或今日副本理解成本较高。",
      count: taskMissed - taskCompleted,
      severity: "high"
    });
  }

  if (bugFeedback > 0) {
    anomalies.push({
      type: "bug_feedback",
      title: "收到 Bug 反馈",
      description: "已有内测同学提交 Bug 类型反馈，建议优先查看最近反馈内容。",
      count: bugFeedback,
      severity: "medium"
    });
  }

  if (scheduleWithUnscheduled > 0) {
    anomalies.push({
      type: "schedule_unscheduled",
      title: "存在未排入任务",
      description: "有排程生成事件包含未排入任务，可能需要降低任务量或优化空闲时间策略。",
      count: scheduleWithUnscheduled,
      severity: "medium"
    });
  }

  return anomalies;
}

function buildDailyComparison(
  events: InternalAnalyticsEvent[],
  feedback: InternalAnalyticsFeedback[],
  now: Date
) {
  const today = now.toISOString().slice(0, 10);
  const yesterday = addDays(now, -1).toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => dateKey(event.createdAt) === today);
  const yesterdayEvents = events.filter((event) => dateKey(event.createdAt) === yesterday);
  const todayCompletedTasks = count(todayEvents, "task_completed");
  const yesterdayCompletedTasks = count(yesterdayEvents, "task_completed");
  const todayFeedbackCount = feedback.filter((item) => dateKey(item.createdAt) === today).length;
  const yesterdayFeedbackCount = feedback.filter((item) => dateKey(item.createdAt) === yesterday).length;

  return {
    todayEventCount: todayEvents.length,
    yesterdayEventCount: yesterdayEvents.length,
    eventDelta: todayEvents.length - yesterdayEvents.length,
    todayCompletedTasks,
    yesterdayCompletedTasks,
    completedTaskDelta: todayCompletedTasks - yesterdayCompletedTasks,
    todayFeedbackCount,
    yesterdayFeedbackCount,
    feedbackDelta: todayFeedbackCount - yesterdayFeedbackCount
  };
}

function buildEventsByDay(events: InternalAnalyticsEvent[]) {
  const byDay = new Map<string, number>();

  for (const event of events) {
    const date = event.createdAt.toISOString().slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + 1);
  }

  return [...byDay.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, countValue]) => ({ date, count: countValue }));
}

function buildTopEvents(events: InternalAnalyticsEvent[]) {
  const byName = new Map<string, number>();

  for (const event of events) {
    byName.set(event.eventName, (byName.get(event.eventName) ?? 0) + 1);
  }

  return [...byName.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([eventName, countValue]) => ({ eventName, count: countValue }));
}

function count(events: InternalAnalyticsEvent[], eventName: string): number {
  return events.filter((event) => event.eventName === eventName).length;
}

function countAny(events: InternalAnalyticsEvent[], eventNames: readonly string[]): number {
  const names = new Set(eventNames);

  return events.filter((event) => names.has(event.eventName)).length;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function readMetadataString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const value = (metadata as Record<string, Prisma.JsonValue>)[key];

  return typeof value === "string" ? value : "";
}

function readMetadataNumber(metadata: unknown, key: string): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = (metadata as Record<string, Prisma.JsonValue>)[key];

  return typeof value === "number" ? value : 0;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeDays(days: number): number {
  return Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 90) : 7;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function endOfDay(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`);
}
