import type { ScheduleBlockStatus, TaskType } from "@/lib/types";
import { createSettlementSummary, calculateQuestBattleReward } from "@/lib/battle/rewards";
import type { TodayBattleData, TodayQuest } from "@/lib/battle/today-types";
import { demoGoalUserId, ensureDemoGoalUser, goalTypeLabels } from "@/lib/goals/goal-api";
import { prisma } from "@/lib/prisma";

export async function getTodayBattleData(now = new Date()): Promise<TodayBattleData> {
  const user = await ensureDemoGoalUser();
  const today = formatDateOnly(now);
  const tomorrow = formatDateOnly(addDays(now, 1));
  const [scheduleBlocks, rescueBlocks, fallbackGoal, healLogs, movedBlockCount] = await Promise.all([
    prisma.scheduleBlock.findMany({
      where: {
        userId: demoGoalUserId,
        startTime: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        },
        status: {
          not: "cancelled"
        }
      },
      include: {
        goal: true,
        task: true
      },
      orderBy: {
        startTime: "asc"
      }
    }),
    prisma.scheduleBlock.findMany({
      where: {
        userId: demoGoalUserId,
        source: "reschedule",
        status: "scheduled",
        startTime: {
          gte: startOfDay(tomorrow),
          lte: endOfDay(tomorrow)
        }
      },
      include: {
        goal: true,
        task: true
      },
      orderBy: {
        startTime: "asc"
      }
    }),
    prisma.goal.findFirst({
      where: {
        userId: demoGoalUserId,
        status: "active"
      },
      orderBy: {
        deadline: "asc"
      }
    }),
    prisma.battleLog.findMany({
      where: {
        userId: demoGoalUserId,
        actionType: "boss_heal",
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    }),
    prisma.scheduleBlock.count({
      where: {
        userId: demoGoalUserId,
        status: "rescheduled",
        source: {
          not: "reschedule"
        },
        startTime: {
          gte: startOfDay(tomorrow)
        },
        updatedAt: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    })
  ]);
  const quests = scheduleBlocks.map(toTodayQuest);
  const rescueQuests = rescueBlocks.map(toTodayQuest);
  const healedScheduleBlockIds = new Set(
    healLogs.map((log) => log.scheduleBlockId).filter((id): id is string => Boolean(id))
  );
  const activeMissedQuests = quests.filter((quest) => quest.status === "missed");
  const missedQuests = quests.filter(
    (quest) => quest.status === "missed" || healedScheduleBlockIds.has(quest.scheduleBlockId)
  );
  const primaryGoal = scheduleBlocks[0]?.goal ?? fallbackGoal;
  const progress = toUserProgress(user.xp);
  const settlement = buildSettlement(today, quests, rescueQuests, healLogs, movedBlockCount, missedQuests.length);

  return {
    progress,
    bossGoal: primaryGoal ? toBossGoalCard(primaryGoal, quests.length) : null,
    quests,
    settlement,
    hasMissedQuests: activeMissedQuests.length > 0,
    missedQuests,
    rescueQuests
  };
}

function toTodayQuest(block: TodayScheduleBlock): TodayQuest {
  const estimatedMinutes = getDurationMinutes(block.startTime, block.endTime);
  const reward = calculateQuestBattleReward({
    estimatedMinutes,
    difficulty: block.task.difficulty,
    taskType: block.task.taskType,
    xpReward: block.task.xpReward
  });

  return {
    id: block.id,
    taskId: block.taskId,
    scheduleBlockId: block.id,
    bossGoalId: block.goalId,
    bossName: block.goal.bossName,
    title: block.task.title,
    description: block.task.description ?? "完成这个副本，推进 Boss 战役进度。",
    scheduledTimeLabel: formatTimeRange(block.startTime, block.endTime),
    estimatedMinutes,
    damage: reward.damage,
    xpReward: reward.xpReward,
    status: toDailyQuestStatus(block.status),
    statusLabel: toDailyQuestStatusLabel(block.status),
    source: block.source
  };
}

function buildSettlement(
  date: string,
  quests: TodayQuest[],
  rescueQuests: TodayQuest[],
  healLogs: Array<{ amount: number }>,
  movedBlockCount = 0,
  missedQuestCountOverride = 0
) {
  const completedQuests = quests.filter((quest) => quest.status === "completed");
  const missedQuests = quests.filter((quest) => quest.status === "missed");
  const totalDamage = completedQuests.reduce((sum, quest) => sum + quest.damage, 0);
  const totalXp = completedQuests.reduce((sum, quest) => sum + quest.xpReward, 0);
  const missedQuestCount = Math.max(missedQuests.length, missedQuestCountOverride);
  const bossHpRecovered = healLogs.reduce((sum, log) => sum + log.amount, 0);
  const tomorrowStudyMinutes = rescueQuests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0);

  return {
    date,
    totalQuestCount: quests.length,
    totalDamage,
    totalXp,
    completedQuestCount: completedQuests.length,
    missedQuestCount,
    bossHpRecovered,
    rescueQuestCount: rescueQuests.length,
    movedBlockCount,
    tomorrowStudyMinutes,
    summary: createSettlementSummary({
      completedQuestCount: completedQuests.length,
      missedQuestCount,
      totalDamage,
      totalXp,
      bossHpRecovered
    })
  };
}

function toBossGoalCard(goal: TodayGoal, questCount: number) {
  return {
    id: goal.id,
    title: goal.title,
    typeLabel: goalTypeLabels[goal.goalType],
    bossName: goal.bossName,
    description: goal.description ?? `继续挑战「${goal.title}」，把今天的副本推进完。`,
    deadlineDate: formatDateOnly(goal.deadline),
    totalHp: goal.bossMaxHp,
    currentHp: goal.bossHp,
    priority: goal.difficulty,
    statusLabel: goal.status === "completed" ? "已击败" : "战斗中",
    stageSummary: questCount > 0 ? `今日 ${questCount} 个副本` : "等待生成今日副本",
    riskLabel: goal.difficulty >= 4 ? "时间紧" : "稳定推进"
  };
}

function toUserProgress(totalXp: number) {
  return {
    level: Math.floor(totalXp / 1000) + 1,
    currentXp: totalXp % 1000,
    nextLevelXp: 1000,
    streakDays: 0
  };
}

function toDailyQuestStatus(status: ScheduleBlockStatus): TodayQuest["status"] {
  if (status === "completed") {
    return "completed";
  }

  if (status === "missed") {
    return "missed";
  }

  if (status === "rescheduled") {
    return "rescheduled";
  }

  return "pending";
}

function toDailyQuestStatusLabel(status: ScheduleBlockStatus): string {
  if (status === "completed") {
    return "已完成";
  }

  if (status === "missed") {
    return "已错过";
  }

  if (status === "rescheduled") {
    return "已重排";
  }

  return "待挑战";
}

function getDurationMinutes(startTime: Date, endTime: Date): number {
  return Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60_000));
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfDay(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

type TodayGoal = {
  id: string;
  title: string;
  description: string | null;
  goalType: "exam" | "certificate" | "homework" | "paper" | "project" | "habit" | "other";
  deadline: Date;
  status: "active" | "completed" | "paused" | "failed";
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  difficulty: number;
};

type TodayScheduleBlock = {
  id: string;
  goalId: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  status: ScheduleBlockStatus;
  source: "auto" | "manual" | "reschedule";
  goal: TodayGoal;
  task: {
    title: string;
    description: string | null;
    difficulty: number;
    taskType: TaskType;
    xpReward: number;
  };
};
