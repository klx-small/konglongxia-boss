import type { SchedulableTask } from "@/lib/scheduler/scheduleTasks";

export type TaskSegment = SchedulableTask & {
  originalTaskId: string;
  segmentIndex: number;
  segmentCount: number;
};

export function splitTasks<T extends SchedulableTask>(tasks: T[]): TaskSegment[] {
  return tasks.flatMap((task) => {
    if (task.estimatedMinutes <= 60) {
      return [
        {
          ...task,
          originalTaskId: task.id,
          segmentIndex: 1,
          segmentCount: 1
        }
      ];
    }

    const segmentMinutes = splitMinutes(task.estimatedMinutes);

    return segmentMinutes.map((minutes, index) => ({
      ...task,
      id: `${task.id}#${index + 1}`,
      title: `${task.title}（${index + 1}/${segmentMinutes.length}）`,
      estimatedMinutes: minutes,
      originalTaskId: task.id,
      segmentIndex: index + 1,
      segmentCount: segmentMinutes.length
    }));
  });
}

function splitMinutes(totalMinutes: number): number[] {
  if (totalMinutes === 90) {
    return [45, 45];
  }

  if (totalMinutes === 120) {
    return [60, 60];
  }

  const segments: number[] = [];
  let remaining = totalMinutes;

  while (remaining > 60) {
    const next = remaining - 60 < 25 ? Math.ceil(remaining / 2) : 60;
    segments.push(next);
    remaining -= next;
  }

  if (remaining > 0) {
    segments.push(remaining);
  }

  return segments;
}
