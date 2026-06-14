import type { ScheduleBlockStatus, TaskStatus, TaskType } from "@/lib/types";
import {
  scheduleTasks,
  type FreeSlotDay,
  type ScheduleBlockDraft,
  type SchedulableTask
} from "@/lib/scheduler/scheduleTasks";

export type RescheduleMode = "all" | "goal" | "tasks";

export type ReschedulableTask = SchedulableTask & {
  status: TaskStatus;
};

export type ExistingScheduleBlock = {
  id: string;
  taskId: string;
  goalId: string;
  startTime: string;
  endTime: string;
  status: ScheduleBlockStatus;
  priority: number;
  deadline: string;
};

export type PlanRescueScheduleInput = {
  mode?: RescheduleMode;
  goalId?: string;
  taskIds?: string[];
  tasks: ReschedulableTask[];
  existingBlocks?: ExistingScheduleBlock[];
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

export type PlanRescueScheduleResult = {
  rescueBlocks: ScheduleBlockDraft[];
  movedBlocks: ExistingScheduleBlock[];
  unchangedBlocks: ExistingScheduleBlock[];
  unscheduledTasks: SchedulableTask[];
};

export function planRescueSchedule(input: PlanRescueScheduleInput): PlanRescueScheduleResult {
  const rescueTasks = getRescueTasks(input);
  const rescueTaskIds = new Set(rescueTasks.map((task) => task.id));
  const existingBlocks = (input.existingBlocks ?? []).filter((block) => !rescueTaskIds.has(block.taskId));

  if (rescueTasks.length === 0) {
    return {
      rescueBlocks: [],
      movedBlocks: [],
      unchangedBlocks: existingBlocks,
      unscheduledTasks: []
    };
  }

  const firstPass = scheduleWithOccupiedBlocks(input, rescueTasks, existingBlocks);

  if (firstPass.unscheduledTasks.length === 0) {
    return {
      rescueBlocks: firstPass.scheduleBlocks,
      movedBlocks: [],
      unchangedBlocks: existingBlocks,
      unscheduledTasks: []
    };
  }

  const movedBlocks: ExistingScheduleBlock[] = [];
  const movableBlocks = getMovableBlocks(existingBlocks, rescueTasks);
  let bestResult = firstPass;

  for (const block of movableBlocks) {
    movedBlocks.push(block);
    const movedBlockIds = new Set(movedBlocks.map((item) => item.id));
    const occupiedBlocks = existingBlocks.filter((item) => !movedBlockIds.has(item.id));
    bestResult = scheduleWithOccupiedBlocks(input, rescueTasks, occupiedBlocks);

    if (bestResult.unscheduledTasks.length === 0) {
      break;
    }
  }

  const movedBlockIds = new Set(movedBlocks.map((block) => block.id));

  return {
    rescueBlocks: bestResult.scheduleBlocks,
    movedBlocks,
    unchangedBlocks: existingBlocks.filter((block) => !movedBlockIds.has(block.id)),
    unscheduledTasks: bestResult.unscheduledTasks
  };
}

function getRescueTasks(input: PlanRescueScheduleInput): SchedulableTask[] {
  const mode = input.mode ?? "all";
  const requestedTaskIds = new Set(input.taskIds ?? []);
  const seenTaskIds = new Set<string>();
  const rescueTasks: SchedulableTask[] = [];

  for (const task of input.tasks) {
    if (seenTaskIds.has(task.id)) {
      continue;
    }

    if (!taskMatchesMode(task, mode, requestedTaskIds, input.goalId)) {
      continue;
    }

    if (!canRescheduleTask(task, mode, requestedTaskIds)) {
      continue;
    }

    seenTaskIds.add(task.id);
    rescueTasks.push({
      id: task.id,
      goalId: task.goalId,
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      difficulty: task.difficulty,
      priority: task.priority,
      deadline: task.deadline,
      taskType: toRescueTaskType(task.taskType),
      xpReward: task.xpReward
    });
  }

  return rescueTasks;
}

function taskMatchesMode(
  task: ReschedulableTask,
  mode: RescheduleMode,
  requestedTaskIds: Set<string>,
  goalId?: string
): boolean {
  if (mode === "tasks") {
    return requestedTaskIds.has(task.id);
  }

  if (mode === "goal") {
    return task.goalId === goalId;
  }

  return true;
}

function canRescheduleTask(
  task: ReschedulableTask,
  mode: RescheduleMode,
  requestedTaskIds: Set<string>
): boolean {
  if (task.status === "completed" || task.status === "skipped") {
    return false;
  }

  if (mode === "tasks" && requestedTaskIds.has(task.id)) {
    return true;
  }

  return task.status === "pending" || task.status === "overdue";
}

function scheduleWithOccupiedBlocks(
  input: PlanRescueScheduleInput,
  rescueTasks: SchedulableTask[],
  occupiedBlocks: ExistingScheduleBlock[]
) {
  return scheduleTasks({
    tasks: rescueTasks,
    freeSlots: subtractOccupiedBlocks(input.freeSlots, occupiedBlocks, input.userPreferences.bufferMinutes ?? 10),
    userPreferences: input.userPreferences,
    dateRange: input.dateRange
  });
}

function subtractOccupiedBlocks(
  freeSlots: FreeSlotDay[],
  occupiedBlocks: ExistingScheduleBlock[],
  bufferMinutes: number
): FreeSlotDay[] {
  const bufferMs = bufferMinutes * 60_000;
  const occupiedByDate = new Map<string, Array<{ start: number; end: number }>>();

  for (const block of occupiedBlocks) {
    if (block.status === "cancelled" || block.status === "missed") {
      continue;
    }

    const start = new Date(block.startTime).getTime() - bufferMs;
    const end = new Date(block.endTime).getTime() + bufferMs;
    const date = block.startTime.slice(0, 10);
    const blocks = occupiedByDate.get(date) ?? [];
    blocks.push({ start, end });
    occupiedByDate.set(date, blocks);
  }

  return freeSlots.map((day) => {
    const occupied = (occupiedByDate.get(day.date) ?? []).sort((a, b) => a.start - b.start);
    const slots = day.slots.flatMap((slot) => subtractIntervals(slot, occupied));
    const totalFreeMinutes = slots.reduce((sum, slot) => sum + getDurationMinutes(slot.startTime, slot.endTime), 0);

    return {
      ...day,
      totalFreeMinutes,
      slots
    };
  });
}

function subtractIntervals(
  slot: { startTime: string; endTime: string },
  occupied: Array<{ start: number; end: number }>
) {
  let segments = [
    {
      start: new Date(slot.startTime).getTime(),
      end: new Date(slot.endTime).getTime()
    }
  ];

  for (const block of occupied) {
    segments = segments.flatMap((segment) => {
      if (block.end <= segment.start || block.start >= segment.end) {
        return [segment];
      }

      const nextSegments: Array<{ start: number; end: number }> = [];

      if (block.start > segment.start) {
        nextSegments.push({ start: segment.start, end: Math.min(block.start, segment.end) });
      }

      if (block.end < segment.end) {
        nextSegments.push({ start: Math.max(block.end, segment.start), end: segment.end });
      }

      return nextSegments;
    });
  }

  return segments
    .filter((segment) => segment.end > segment.start)
    .map((segment) => ({
      startTime: new Date(segment.start).toISOString(),
      endTime: new Date(segment.end).toISOString()
    }));
}

function getMovableBlocks(
  existingBlocks: ExistingScheduleBlock[],
  rescueTasks: SchedulableTask[]
): ExistingScheduleBlock[] {
  const highestRescuePriority = Math.max(...rescueTasks.map((task) => task.priority));
  const earliestRescueDeadline = rescueTasks
    .map((task) => task.deadline)
    .sort((a, b) => a.localeCompare(b))[0];

  return existingBlocks
    .filter((block) => block.status === "scheduled")
    .filter(
      (block) =>
        block.priority < highestRescuePriority ||
        normalizeDateOnly(block.deadline).localeCompare(normalizeDateOnly(earliestRescueDeadline)) > 0
    )
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      const deadlineOrder = normalizeDateOnly(b.deadline).localeCompare(normalizeDateOnly(a.deadline));

      if (deadlineOrder !== 0) {
        return deadlineOrder;
      }

      return a.startTime.localeCompare(b.startTime);
    });
}

function toRescueTaskType(taskType: TaskType): TaskType {
  if (taskType === "boss_battle") {
    return "boss_battle";
  }

  return "rescue_dungeon";
}

function getDurationMinutes(startTime: string, endTime: string): number {
  return Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000));
}

function normalizeDateOnly(value: string): string {
  return value.slice(0, 10);
}
