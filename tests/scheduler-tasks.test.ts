import { describe, expect, it } from "vitest";

import { scheduleTasks } from "@/lib/scheduler/scheduleTasks";
import { sortTasksForScheduling } from "@/lib/scheduler/sortTasksForScheduling";
import { splitTasks } from "@/lib/scheduler/splitTasks";
import type { SchedulableTask } from "@/lib/scheduler/scheduleTasks";

const baseTask: SchedulableTask = {
  id: "task-1",
  goalId: "goal-1",
  title: "词汇小怪",
  estimatedMinutes: 25,
  difficulty: 2,
  priority: 3,
  deadline: "2026-06-20",
  taskType: "small_monster",
  xpReward: 50
};

function task(overrides: Partial<SchedulableTask>): SchedulableTask {
  return { ...baseTask, id: overrides.id ?? baseTask.id, ...overrides };
}

describe("splitTasks", () => {
  it("25 分钟任务不切分", () => {
    const segments = splitTasks([task({ estimatedMinutes: 25 })]);

    expect(segments).toHaveLength(1);
    expect(segments[0].estimatedMinutes).toBe(25);
    expect(segments[0].title).toBe("词汇小怪");
  });

  it("90 分钟任务切成两个片段", () => {
    const segments = splitTasks([task({ title: "真题训练", estimatedMinutes: 90 })]);

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.estimatedMinutes)).toEqual([45, 45]);
    expect(segments.map((segment) => segment.title)).toEqual(["真题训练（1/2）", "真题训练（2/2）"]);
  });

  it("120 分钟任务切成两个 60 分钟片段", () => {
    const segments = splitTasks([task({ estimatedMinutes: 120 })]);

    expect(segments.map((segment) => segment.estimatedMinutes)).toEqual([60, 60]);
  });
});

describe("sortTasksForScheduling", () => {
  it("deadline 近的任务优先", () => {
    const sorted = sortTasksForScheduling([
      task({ id: "late", deadline: "2026-06-30" }),
      task({ id: "early", deadline: "2026-06-15" })
    ]);

    expect(sorted[0].id).toBe("early");
  });

  it("priority 高的任务优先", () => {
    const sorted = sortTasksForScheduling([
      task({ id: "low", priority: 1 }),
      task({ id: "high", priority: 5 })
    ]);

    expect(sorted[0].id).toBe("high");
  });
});

describe("scheduleTasks", () => {
  const freeSlots = [
    {
      date: "2026-06-15",
      weekday: 1,
      totalFreeMinutes: 120,
      slots: [
        { startTime: "2026-06-15T00:00:00.000Z", endTime: "2026-06-15T02:00:00.000Z" }
      ]
    },
    {
      date: "2026-06-16",
      weekday: 2,
      totalFreeMinutes: 25,
      slots: [
        { startTime: "2026-06-16T01:00:00.000Z", endTime: "2026-06-16T01:25:00.000Z" }
      ]
    }
  ];

  it("课程时间不会被占用", () => {
    const result = scheduleTasks({
      tasks: [task({ estimatedMinutes: 25 })],
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.scheduleBlocks[0].startTime).toBe("2026-06-15T00:00:00.000Z");
  });

  it("每天不会超过 dailyStudyLimitMinutes", () => {
    const result = scheduleTasks({
      tasks: [
        task({ id: "a", estimatedMinutes: 60 }),
        task({ id: "b", estimatedMinutes: 60 })
      ],
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: 60 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.scheduleBlocks).toHaveLength(1);
    expect(result.unscheduledTasks).toHaveLength(1);
  });

  it("任务之间有 10 分钟 buffer", () => {
    const result = scheduleTasks({
      tasks: [
        task({ id: "a", estimatedMinutes: 25 }),
        task({ id: "b", estimatedMinutes: 25 })
      ],
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.scheduleBlocks[0].endTime).toBe("2026-06-15T00:25:00.000Z");
    expect(result.scheduleBlocks[1].startTime).toBe("2026-06-15T00:35:00.000Z");
  });

  it("排不进去的任务进入 unscheduledTasks", () => {
    const result = scheduleTasks({
      tasks: [task({ id: "too-long", estimatedMinutes: 180, taskType: "boss_battle" })],
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: 240 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.scheduleBlocks).toHaveLength(0);
    expect(result.unscheduledTasks[0].id).toBe("too-long");
  });

  it("small_monster 可以排进 25 分钟空闲时间", () => {
    const result = scheduleTasks({
      tasks: [task({ id: "small", estimatedMinutes: 25, deadline: "2026-06-16" })],
      freeSlots,
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.scheduleBlocks[0].taskId).toBe("small");
  });

  it("boss_battle 不会被排进太短的时间段", () => {
    const result = scheduleTasks({
      tasks: [task({ id: "boss", estimatedMinutes: 90, taskType: "boss_battle" })],
      freeSlots: [freeSlots[1]],
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" }
    });

    expect(result.unscheduledTasks[0].id).toBe("boss");
  });
});
