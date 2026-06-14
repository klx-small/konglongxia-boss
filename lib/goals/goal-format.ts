import type { GoalIntensity, GoalStatus, GoalType, TaskType } from "@/lib/types";

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

export const taskTypeLabels: Record<TaskType, string> = {
  small_monster: "小怪任务",
  elite_monster: "精英怪",
  daily_dungeon: "每日副本",
  boss_battle: "Boss 战",
  rescue_dungeon: "救援副本"
};

export function getRemainingDays(deadline: string, now = new Date()): number {
  const deadlineDate = parseDateOnly(deadline);
  const today = parseDateOnly(now.toISOString().slice(0, 10));

  return Math.ceil((deadlineDate.getTime() - today.getTime()) / 86_400_000);
}

export function formatRemainingDays(deadline: string, now = new Date()): string {
  const days = getRemainingDays(deadline, now);

  if (days < 0) {
    return `已逾期 ${Math.abs(days)} 天`;
  }

  if (days === 0) {
    return "今天截止";
  }

  return `剩余 ${days} 天`;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
