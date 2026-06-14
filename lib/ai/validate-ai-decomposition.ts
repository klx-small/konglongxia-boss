import type { Goal } from "@/lib/types";
import type { AiDecompositionResult, AiTask } from "@/lib/ai/types";

const allowedTaskTypes = new Set([
  "small_monster",
  "elite_monster",
  "daily_dungeon",
  "boss_battle",
  "rescue_dungeon"
]);

export type AiValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: string[] };

export function validateAiDecomposition(
  result: unknown,
  goal: Pick<Goal, "deadline">
): AiValidationResult {
  const errors: string[] = [];

  if (!isRecord(result)) {
    return { valid: false, errors: ["AI 输出必须是 JSON 对象。"] };
  }

  if (!Array.isArray(result.milestones)) {
    return { valid: false, errors: ["AI 输出缺少 milestones 数组。"] };
  }

  if (result.milestones.length === 0) {
    errors.push("至少需要 1 个阶段关卡。");
  }

  const goalDeadline = parseDateOnly(goal.deadline);
  let taskCount = 0;

  result.milestones.forEach((milestone, milestoneIndex) => {
    const milestoneLabel = `第 ${milestoneIndex + 1} 个阶段`;

    if (!isRecord(milestone)) {
      errors.push(`${milestoneLabel} 格式不正确。`);
      return;
    }

    if (!isNonEmptyString(milestone.title)) {
      errors.push(`${milestoneLabel} 标题不能为空。`);
    }

    if (!isNonEmptyString(milestone.description)) {
      errors.push(`${milestoneLabel} 描述不能为空。`);
    }

    if (!Number.isFinite(milestone.order)) {
      errors.push(`${milestoneLabel} order 必须是数字。`);
    }

    if (!isDateOnlyNotAfter(milestone.dueDate, goalDeadline)) {
      errors.push(`${milestoneLabel} dueDate 不能晚于目标截止日期。`);
    }

    if (!Array.isArray(milestone.tasks)) {
      errors.push(`${milestoneLabel} 缺少 tasks 数组。`);
      return;
    }

    milestone.tasks.forEach((task, taskIndex) => {
      taskCount += 1;
      validateTask(task, `${milestoneLabel}第 ${taskIndex + 1} 个任务`, goalDeadline, errors);
    });
  });

  if (taskCount === 0) {
    errors.push("至少需要 1 个小怪任务。");
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

function validateTask(
  task: unknown,
  label: string,
  goalDeadline: Date,
  errors: string[]
) {
  if (!isRecord(task)) {
    errors.push(`${label} 格式不正确。`);
    return;
  }

  if (!isNonEmptyString(task.title)) {
    errors.push(`${label} 标题不能为空。`);
  }

  if (!isNonEmptyString(task.description)) {
    errors.push(`${label} 描述不能为空。`);
  }

  if (!isNumberInRange(task.estimatedMinutes, 10, 180)) {
    errors.push(`${label} estimatedMinutes 必须在 10-180 分钟之间。`);
  }

  if (!isNumberInRange(task.difficulty, 1, 5)) {
    errors.push(`${label} difficulty 必须是 1-5。`);
  }

  if (!isNumberInRange(task.priority, 1, 5)) {
    errors.push(`${label} priority 必须是 1-5。`);
  }

  if (!isDateOnlyNotAfter(task.deadline, goalDeadline)) {
    errors.push(`${label} deadline 不能晚于目标截止日期。`);
  }

  if (!isAllowedTaskType(task.taskType)) {
    errors.push(`${label} 任务类型不正确。`);
  }

  if (!isNumberInRange(task.xpReward, 1, 1000)) {
    errors.push(`${label} xpReward 必须在 1-1000 之间。`);
  }
}

export function assertValidAiDecomposition(
  result: unknown,
  goal: Pick<Goal, "deadline">
): asserts result is AiDecompositionResult {
  const validation = validateAiDecomposition(result, goal);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
}

export function isAllowedTaskType(value: unknown): value is AiTask["taskType"] {
  return typeof value === "string" && allowedTaskTypes.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isDateOnlyNotAfter(value: unknown, maxDate: Date): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const date = parseDateOnly(value);

  return !Number.isNaN(date.getTime()) && date.getTime() <= maxDate.getTime();
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));

  if (!match) {
    return new Date(Number.NaN);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
