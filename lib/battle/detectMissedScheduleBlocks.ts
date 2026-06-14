import type { ScheduleBlockStatus, TaskStatus } from "@/lib/types";

export type MissedScheduleBlockCandidate = {
  id: string;
  endTime: string | Date;
  status: ScheduleBlockStatus;
  taskStatus: TaskStatus;
};

export type DetectMissedScheduleBlocksInput<T extends MissedScheduleBlockCandidate> = {
  now: Date;
  scheduleBlocks: T[];
};

export function detectMissedScheduleBlocks<T extends MissedScheduleBlockCandidate>(
  input: DetectMissedScheduleBlocksInput<T>
) {
  return {
    missedBlocks: input.scheduleBlocks.filter((block) => shouldMarkMissed(block, input.now))
  };
}

function shouldMarkMissed(block: MissedScheduleBlockCandidate, now: Date): boolean {
  if (block.status !== "scheduled") {
    return false;
  }

  if (block.taskStatus === "completed" || block.taskStatus === "skipped") {
    return false;
  }

  return new Date(block.endTime).getTime() < now.getTime();
}
