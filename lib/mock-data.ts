import type { BattleSettlement, BossGoal, Course, DailyQuest, UserProgress } from "@/lib/types";

export const mockUserProgress: UserProgress = {
  level: 6,
  currentXp: 760,
  nextLevelXp: 1000,
  streakDays: 5
};

export const mockBossGoals: BossGoal[] = [
  {
    id: "goal-math-final",
    title: "高等数学期末复习",
    typeLabel: "考试",
    bossName: "高数期末巨龙",
    description: "三周内完成高数核心章节复习和错题回炉。",
    deadlineDate: "2026-07-05",
    totalHp: 1200,
    currentHp: 760,
    priority: 5,
    statusLabel: "战斗中",
    stageSummary: "第 2 / 4 阶段",
    riskLabel: "中等风险"
  },
  {
    id: "goal-cet4-listening",
    title: "大学英语四级听力冲刺",
    typeLabel: "考证",
    bossName: "四级听力突击兽",
    description: "每天完成听力精听和错题复盘，稳定正确率。",
    deadlineDate: "2026-06-28",
    totalHp: 800,
    currentHp: 510,
    priority: 4,
    statusLabel: "战斗中",
    stageSummary: "第 1 / 3 阶段",
    riskLabel: "时间紧"
  }
];

export const mockCourses: Course[] = [
  {
    id: "course-math",
    name: "高等数学",
    teacher: "王老师",
    location: "二教 301",
    weekday: 1,
    weekdayLabel: "周一",
    startTime: "08:30",
    endTime: "10:05",
    startLocalTime: "08:30",
    endLocalTime: "10:05",
    startWeek: 1,
    endWeek: 16,
    weekType: "all",
    color: "#13795b",
    startAtUtc: "2026-06-15T00:30:00.000Z",
    endAtUtc: "2026-06-15T02:05:00.000Z",
    sourceLabel: "手动录入"
  },
  {
    id: "course-english",
    name: "大学英语",
    teacher: "李老师",
    location: "外语楼 204",
    weekday: 2,
    weekdayLabel: "周二",
    startTime: "10:20",
    endTime: "11:55",
    startLocalTime: "10:20",
    endLocalTime: "11:55",
    startWeek: 1,
    endWeek: 16,
    weekType: "all",
    color: "#2f6fbb",
    startAtUtc: "2026-06-16T02:20:00.000Z",
    endAtUtc: "2026-06-16T03:55:00.000Z",
    sourceLabel: "手动录入"
  },
  {
    id: "course-programming",
    name: "程序设计实践",
    teacher: "陈老师",
    location: "实验楼 506",
    weekday: 3,
    weekdayLabel: "周三",
    startTime: "14:00",
    endTime: "15:35",
    startLocalTime: "14:00",
    endLocalTime: "15:35",
    startWeek: 1,
    endWeek: 16,
    weekType: "odd",
    color: "#8b5cf6",
    startAtUtc: "2026-06-17T06:00:00.000Z",
    endAtUtc: "2026-06-17T07:35:00.000Z",
    sourceLabel: "手动录入"
  },
  {
    id: "course-politics",
    name: "形势与政策",
    teacher: "赵老师",
    location: "三教 102",
    weekday: 4,
    weekdayLabel: "周四",
    startTime: "16:00",
    endTime: "17:35",
    startLocalTime: "16:00",
    endLocalTime: "17:35",
    startWeek: 1,
    endWeek: 12,
    weekType: "even",
    color: "#b7791f",
    startAtUtc: "2026-06-18T08:00:00.000Z",
    endAtUtc: "2026-06-18T09:35:00.000Z",
    sourceLabel: "手动录入"
  },
  {
    id: "course-physics",
    name: "大学物理",
    teacher: "周老师",
    location: "理科楼 210",
    weekday: 5,
    weekdayLabel: "周五",
    startTime: "18:30",
    endTime: "20:05",
    startLocalTime: "18:30",
    endLocalTime: "20:05",
    startWeek: 1,
    endWeek: 16,
    weekType: "all",
    color: "#dc2626",
    startAtUtc: "2026-06-19T10:30:00.000Z",
    endAtUtc: "2026-06-19T12:05:00.000Z",
    sourceLabel: "手动录入"
  }
];

export const mockTodayQuests: DailyQuest[] = [
  {
    id: "quest-limit",
    bossGoalId: "goal-math-final",
    bossName: "高数期末巨龙",
    title: "复习极限与连续",
    description: "整理定义、典型题和本周错题，完成 8 道基础题。",
    scheduledTimeLabel: "19:30 - 20:30",
    estimatedMinutes: 60,
    damage: 120,
    xpReward: 60,
    status: "pending",
    statusLabel: "待挑战"
  },
  {
    id: "quest-listening",
    bossGoalId: "goal-cet4-listening",
    bossName: "四级听力突击兽",
    title: "精听一套短篇新闻",
    description: "先完整听一遍，再逐句复盘关键词和错因。",
    scheduledTimeLabel: "21:00 - 21:40",
    estimatedMinutes: 40,
    damage: 80,
    xpReward: 45,
    status: "pending",
    statusLabel: "待挑战"
  },
  {
    id: "quest-review",
    bossGoalId: "goal-math-final",
    bossName: "高数期末巨龙",
    title: "回炉 5 道错题",
    description: "标注错因，把同类题的解题步骤写成一张卡片。",
    scheduledTimeLabel: "22:00 - 22:30",
    estimatedMinutes: 30,
    damage: 70,
    xpReward: 35,
    status: "pending",
    statusLabel: "待挑战"
  }
];

export const mockSettlement: BattleSettlement = {
  date: "今天",
  totalDamage: 270,
  totalXp: 140,
  completedQuestCount: 0,
  missedQuestCount: 0,
  bossHpRecovered: 0,
  summary: "按当前计划完成后，主 Boss 会进入低血量区间，明天可以开始刷综合题。"
};

