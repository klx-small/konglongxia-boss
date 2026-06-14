export type GoalType =
  | "exam"
  | "certificate"
  | "homework"
  | "paper"
  | "project"
  | "habit"
  | "other";

export type GoalIntensity = "relaxed" | "standard" | "sprint";

export type GoalInput = {
  title: string;
  description?: string;
  goalType: GoalType;
  deadline: string;
  currentLevel?: string;
  dailyAvailableMinutes: number;
  intensity: GoalIntensity;
};

export type BossFromGoal = {
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  difficulty: number;
  bossDescription: string;
};

type CreateBossOptions = {
  now?: string | Date;
};

const baseHpByGoalType: Record<GoalType, number> = {
  exam: 1000,
  certificate: 900,
  homework: 560,
  paper: 1100,
  project: 1050,
  habit: 700,
  other: 760
};

const intensityMultiplier: Record<GoalIntensity, number> = {
  relaxed: 0.85,
  standard: 1,
  sprint: 1.25
};

export function createBossFromGoalInput(input: GoalInput, options: CreateBossOptions = {}): BossFromGoal {
  const bossName = buildBossName(input);
  const difficulty = calculateDifficulty(input.deadline, options.now);
  const baseHp = baseHpByGoalType[input.goalType] ?? baseHpByGoalType.other;
  const timeFactor = Math.max(0, Math.min(input.dailyAvailableMinutes, 240));
  const bossMaxHp = roundToNearestTen(
    baseHp * intensityMultiplier[input.intensity] + difficulty * 90 + timeFactor
  );

  return {
    bossName,
    bossHp: bossMaxHp,
    bossMaxHp,
    difficulty,
    bossDescription: `「${input.title}」已经变成 ${bossName}。难度 ${difficulty} 星，准备开始战役。`
  };
}

function buildBossName(input: GoalInput): string {
  const title = input.title.trim();

  if (title.includes("四级")) {
    return "四级巨龙";
  }

  if (title.includes("高数") || title.includes("高等数学")) {
    return "高数石像鬼";
  }

  if (title.includes("期末")) {
    return "期末魔王";
  }

  if (title.includes("论文") || input.goalType === "paper") {
    return "论文吞噬兽";
  }

  if (title.includes("作业") || input.goalType === "homework") {
    return "作业史莱姆王";
  }

  if (title.includes("考证") || input.goalType === "certificate") {
    return "考证机械龙";
  }

  if (input.goalType === "project") {
    return "项目守门人";
  }

  if (input.goalType === "habit") {
    return "习惯守护兽";
  }

  return "目标巨兽";
}

function calculateDifficulty(deadline: string, now: string | Date = new Date()): number {
  const deadlineDate = parseDateOnly(deadline);
  const nowDate = now instanceof Date ? parseDateOnly(now.toISOString().slice(0, 10)) : parseDateOnly(now);
  const daysRemaining = Math.ceil((deadlineDate.getTime() - nowDate.getTime()) / 86_400_000);

  if (daysRemaining <= 3) {
    return 5;
  }

  if (daysRemaining <= 7) {
    return 4;
  }

  if (daysRemaining <= 14) {
    return 3;
  }

  if (daysRemaining <= 30) {
    return 2;
  }

  return 1;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}
