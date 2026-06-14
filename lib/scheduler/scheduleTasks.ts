import type { TaskType } from "@/lib/types";
import { sortTasksForScheduling } from "@/lib/scheduler/sortTasksForScheduling";

export type SchedulableTask = {
  id: string;
  goalId: string;
  title: string;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: string;
  taskType: TaskType;
  xpReward: number;
};

export type FreeSlotDay = {
  date: string;
  weekday: number;
  totalFreeMinutes: number;
  slots: Array<{
    startTime: string;
    endTime: string;
  }>;
};

export type ScheduleBlockDraft = {
  userId?: string;
  goalId: string;
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
  taskType: TaskType;
  xpReward: number;
};

export type ScheduleTasksInput = {
  tasks: SchedulableTask[];
  freeSlots: FreeSlotDay[];
  userPreferences: {
    dailyStudyLimitMinutes: number;
    bufferMinutes?: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
};

export type ScheduleTasksResult = {
  scheduleBlocks: ScheduleBlockDraft[];
  unscheduledTasks: SchedulableTask[];
};

export function scheduleTasks(input: ScheduleTasksInput): ScheduleTasksResult {
  const bufferMinutes = input.userPreferences.bufferMinutes ?? 10;
  const dayUsage = new Map<string, number>();
  const availableSlots = input.freeSlots.flatMap((day) =>
    day.slots.map((slot) => ({
      date: day.date,
      cursor: new Date(slot.startTime).getTime(),
      end: new Date(slot.endTime).getTime()
    }))
  );
  const scheduleBlocks: ScheduleBlockDraft[] = [];
  const unscheduledTasks: SchedulableTask[] = [];

  for (const task of sortTasksForScheduling(input.tasks)) {
    const placement = findPlacement(task, availableSlots, dayUsage, input.userPreferences.dailyStudyLimitMinutes);

    if (!placement) {
      unscheduledTasks.push(task);
      continue;
    }

    const startTime = new Date(placement.start).toISOString();
    const endTime = new Date(placement.end).toISOString();
    placement.slot.cursor = placement.end + bufferMinutes * 60_000;
    dayUsage.set(placement.slot.date, (dayUsage.get(placement.slot.date) ?? 0) + task.estimatedMinutes);
    scheduleBlocks.push({
      goalId: task.goalId,
      taskId: task.id,
      title: task.title,
      startTime,
      endTime,
      estimatedMinutes: task.estimatedMinutes,
      taskType: task.taskType,
      xpReward: task.xpReward
    });
  }

  return {
    scheduleBlocks: scheduleBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    unscheduledTasks
  };
}

function findPlacement(
  task: SchedulableTask,
  slots: Array<{ date: string; cursor: number; end: number }>,
  dayUsage: Map<string, number>,
  dailyLimit: number
) {
  const durationMs = task.estimatedMinutes * 60_000;

  for (const slot of slots) {
    const usedMinutes = dayUsage.get(slot.date) ?? 0;

    if (usedMinutes + task.estimatedMinutes > dailyLimit) {
      continue;
    }

    if (!slotCanHostTask(task, slot.end - slot.cursor)) {
      continue;
    }

    const end = slot.cursor + durationMs;

    if (end <= slot.end) {
      return { slot, start: slot.cursor, end };
    }
  }

  return null;
}

function slotCanHostTask(task: SchedulableTask, slotMs: number): boolean {
  const slotMinutes = slotMs / 60_000;

  if (task.taskType === "boss_battle") {
    return slotMinutes >= Math.max(90, task.estimatedMinutes);
  }

  return slotMinutes >= task.estimatedMinutes;
}
