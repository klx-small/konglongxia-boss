import { prisma } from "@/lib/prisma";
import {
  createBossFromGoalInput,
  type GoalInput,
  type GoalIntensity,
  type GoalType
} from "@/lib/goals/create-boss";
import type { MilestoneStatus, TaskStatus, TaskType } from "@/lib/types";

export const demoGoalUserId = "demo-user";

export type GoalStatus = "active" | "completed" | "paused" | "failed";

export type GoalPayload = Omit<GoalInput, "currentLevel" | "description"> & {
  userId: string;
  description: string;
  currentLevel: string;
  status: GoalStatus;
};

export type GoalDto = GoalPayload & {
  id: string;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  difficulty: number;
  bossDescription: string;
  milestones: MilestoneDto[];
  tasks: TaskDto[];
  createdAt: string;
  updatedAt: string;
};

export type MilestoneDto = {
  id: string;
  goalId: string;
  title: string;
  description: string;
  order: number;
  dueDate: string;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
};

export type TaskDto = {
  id: string;
  goalId: string;
  milestoneId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: string;
  taskType: TaskType;
  xpReward: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

const goalTypes: GoalType[] = [
  "exam",
  "certificate",
  "homework",
  "paper",
  "project",
  "habit",
  "other"
];

const intensities: GoalIntensity[] = ["relaxed", "standard", "sprint"];
const statuses: GoalStatus[] = ["active", "completed", "paused", "failed"];

export const goalTypeLabels: Record<GoalType, string> = {
  exam: "考试",
  certificate: "考证",
  homework: "作业",
  paper: "论文",
  project: "项目",
  habit: "习惯",
  other: "其他"
};

export const intensityLabels: Record<GoalIntensity, string> = {
  relaxed: "轻松",
  standard: "标准",
  sprint: "冲刺"
};

export const statusLabels: Record<GoalStatus, string> = {
  active: "战斗中",
  completed: "已击败",
  paused: "暂停",
  failed: "已失败"
};

export async function ensureDemoGoalUser() {
  return prisma.user.upsert({
    where: { id: demoGoalUserId },
    update: {},
    create: {
      id: demoGoalUserId,
      nickname: "恐龙侠",
      timezone: "Asia/Shanghai"
    }
  });
}

export function normalizeGoalPayload(input: unknown, defaultStatus: GoalStatus = "active"): GoalPayload {
  if (!input || typeof input !== "object") {
    throw new Error("目标数据不能为空。");
  }

  const data = input as Record<string, unknown>;
  const dailyAvailableMinutes = Number(data.dailyAvailableMinutes);
  const goalType = normalizeGoalType(data.goalType);
  const intensity = normalizeIntensity(data.intensity);
  const status = data.status === undefined ? defaultStatus : normalizeStatus(data.status);

  if (!Number.isInteger(dailyAvailableMinutes) || dailyAvailableMinutes < 25) {
    throw new Error("每天最多学习时间必须不少于 25 分钟。");
  }

  return {
    userId: typeof data.userId === "string" && data.userId ? data.userId : demoGoalUserId,
    title: requireString(data.title, "目标名称"),
    description: optionalString(data.description),
    goalType,
    deadline: normalizeDateOnly(data.deadline),
    currentLevel: optionalString(data.currentLevel) || "未填写",
    dailyAvailableMinutes,
    intensity,
    status
  };
}

export function goalPayloadToPrismaData(payload: GoalPayload) {
  const boss = createBossFromGoalInput(payload);

  return {
    userId: payload.userId,
    title: payload.title,
    description: payload.description,
    goalType: payload.goalType,
    deadline: parseUtcDate(payload.deadline),
    currentLevel: payload.currentLevel,
    dailyAvailableMinutes: payload.dailyAvailableMinutes,
    intensity: payload.intensity,
    status: payload.status,
    bossName: boss.bossName,
    bossHp: boss.bossHp,
    bossMaxHp: boss.bossMaxHp,
    difficulty: boss.difficulty
  };
}

export function toGoalDto(goal: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  goalType: GoalType;
  deadline: Date;
  currentLevel: string;
  dailyAvailableMinutes: number;
  intensity: GoalIntensity;
  status: GoalStatus;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  difficulty: number;
  milestones?: Array<{
    id: string;
    goalId: string;
    title: string;
    description: string | null;
    order: number;
    dueDate: Date;
    status: MilestoneStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
  tasks?: Array<{
    id: string;
    goalId: string;
    milestoneId: string;
    title: string;
    description: string | null;
    estimatedMinutes: number;
    difficulty: number;
    priority: number;
    deadline: Date;
    taskType: TaskType;
    xpReward: number;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}): GoalDto {
  return {
    id: goal.id,
    userId: goal.userId,
    title: goal.title,
    description: goal.description ?? "",
    goalType: goal.goalType,
    deadline: formatDateOnly(goal.deadline),
    currentLevel: goal.currentLevel,
    dailyAvailableMinutes: goal.dailyAvailableMinutes,
    intensity: goal.intensity,
    status: goal.status,
    bossName: goal.bossName,
    bossHp: goal.bossHp,
    bossMaxHp: goal.bossMaxHp,
    difficulty: goal.difficulty,
    bossDescription: `「${goal.title}」已经变成 ${goal.bossName}。难度 ${goal.difficulty} 星，准备开始战役。`,
    milestones: (goal.milestones ?? []).map(toMilestoneDto),
    tasks: (goal.tasks ?? []).map(toTaskDto),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString()
  };
}

function toMilestoneDto(milestone: {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  order: number;
  dueDate: Date;
  status: MilestoneStatus;
  createdAt: Date;
  updatedAt: Date;
}): MilestoneDto {
  return {
    id: milestone.id,
    goalId: milestone.goalId,
    title: milestone.title,
    description: milestone.description ?? "",
    order: milestone.order,
    dueDate: formatDateOnly(milestone.dueDate),
    status: milestone.status,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString()
  };
}

function toTaskDto(task: {
  id: string;
  goalId: string;
  milestoneId: string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: Date;
  taskType: TaskType;
  xpReward: number;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}): TaskDto {
  return {
    id: task.id,
    goalId: task.goalId,
    milestoneId: task.milestoneId,
    title: task.title,
    description: task.description ?? "",
    estimatedMinutes: task.estimatedMinutes,
    difficulty: task.difficulty,
    priority: task.priority,
    deadline: formatDateOnly(task.deadline),
    taskType: task.taskType,
    xpReward: task.xpReward,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}不能为空。`);
  }

  return value.trim();
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeGoalType(value: unknown): GoalType {
  if (typeof value === "string" && goalTypes.includes(value as GoalType)) {
    return value as GoalType;
  }

  throw new Error("目标类型不正确。");
}

function normalizeIntensity(value: unknown): GoalIntensity {
  if (typeof value === "string" && intensities.includes(value as GoalIntensity)) {
    return value as GoalIntensity;
  }

  throw new Error("强度选择不正确。");
}

function normalizeStatus(value: unknown): GoalStatus {
  if (typeof value === "string" && statuses.includes(value as GoalStatus)) {
    return value as GoalStatus;
  }

  throw new Error("目标状态不正确。");
}

function normalizeDateOnly(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("截止日期不能为空。");
  }

  const date = parseUtcDate(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("截止日期格式不正确。");
  }

  return formatDateOnly(date);
}

function parseUtcDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return new Date(Number.NaN);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
