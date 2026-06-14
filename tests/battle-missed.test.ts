import { describe, expect, it } from "vitest";

import { calculateBossHeal } from "@/lib/battle/calculateBossHeal";
import { detectMissedScheduleBlocks } from "@/lib/battle/detectMissedScheduleBlocks";
import { planRescueSchedule } from "@/lib/scheduler/rescheduleTasks";

describe("未完成副本检测", () => {
  it("过期未完成任务会被标记 missed", () => {
    const result = detectMissedScheduleBlocks({
      now: new Date("2026-06-13T10:00:00.000Z"),
      scheduleBlocks: [
        {
          id: "block-1",
          endTime: "2026-06-13T09:00:00.000Z",
          status: "scheduled",
          taskStatus: "scheduled"
        }
      ]
    });

    expect(result.missedBlocks.map((block) => block.id)).toEqual(["block-1"]);
  });

  it("未过期任务不会被标记 missed", () => {
    const result = detectMissedScheduleBlocks({
      now: new Date("2026-06-13T08:00:00.000Z"),
      scheduleBlocks: [
        {
          id: "block-1",
          endTime: "2026-06-13T09:00:00.000Z",
          status: "scheduled",
          taskStatus: "scheduled"
        }
      ]
    });

    expect(result.missedBlocks).toHaveLength(0);
  });

  it("completed 任务不会被标记 missed", () => {
    const result = detectMissedScheduleBlocks({
      now: new Date("2026-06-13T10:00:00.000Z"),
      scheduleBlocks: [
        {
          id: "block-1",
          endTime: "2026-06-13T09:00:00.000Z",
          status: "scheduled",
          taskStatus: "completed"
        },
        {
          id: "block-2",
          endTime: "2026-06-13T09:00:00.000Z",
          status: "completed",
          taskStatus: "completed"
        }
      ]
    });

    expect(result.missedBlocks).toHaveLength(0);
  });

  it("skipped 任务不会被标记 missed", () => {
    const result = detectMissedScheduleBlocks({
      now: new Date("2026-06-13T10:00:00.000Z"),
      scheduleBlocks: [
        {
          id: "block-1",
          endTime: "2026-06-13T09:00:00.000Z",
          status: "scheduled",
          taskStatus: "skipped"
        }
      ]
    });

    expect(result.missedBlocks).toHaveLength(0);
  });
});

describe("Boss 回血规则", () => {
  it("Boss 回血不能超过 bossMaxHp", () => {
    const heal = calculateBossHeal({
      task: {
        id: "task-1",
        xpReward: 120,
        estimatedMinutes: 45,
        difficulty: 3,
        taskType: "elite_monster"
      },
      bossHp: 990,
      bossMaxHp: 1000,
      alreadyHealed: false
    });

    expect(heal.healAmount).toBe(10);
    expect(heal.nextBossHp).toBe(1000);
  });

  it("同一个 missed 任务不能重复回血", () => {
    const heal = calculateBossHeal({
      task: {
        id: "task-1",
        xpReward: 120,
        estimatedMinutes: 45,
        difficulty: 3,
        taskType: "elite_monster"
      },
      bossHp: 700,
      bossMaxHp: 1000,
      alreadyHealed: true
    });

    expect(heal.healAmount).toBe(0);
    expect(heal.nextBossHp).toBe(700);
  });
});

describe("补救副本重排核心逻辑", () => {
  it("completed 任务不会被重排，missed 任务可以被安排到未来空闲时间", () => {
    const result = planRescueSchedule({
      tasks: [
        {
          id: "task-missed",
          goalId: "goal-1",
          title: "补救听力训练",
          estimatedMinutes: 45,
          difficulty: 3,
          priority: 5,
          deadline: "2026-06-20",
          taskType: "elite_monster",
          xpReward: 100,
          status: "overdue"
        },
        {
          id: "task-completed",
          goalId: "goal-1",
          title: "已完成任务",
          estimatedMinutes: 45,
          difficulty: 3,
          priority: 5,
          deadline: "2026-06-20",
          taskType: "elite_monster",
          xpReward: 100,
          status: "completed"
        }
      ],
      freeSlots: [
        {
          date: "2026-06-14",
          weekday: 7,
          totalFreeMinutes: 60,
          slots: [
            {
              startTime: "2026-06-14T12:00:00.000Z",
              endTime: "2026-06-14T13:00:00.000Z"
            }
          ]
        }
      ],
      userPreferences: {
        dailyStudyLimitMinutes: 60
      },
      dateRange: {
        startDate: "2026-06-14",
        endDate: "2026-06-20"
      }
    });

    expect(result.rescueBlocks).toHaveLength(1);
    expect(result.rescueBlocks[0].taskId).toBe("task-missed");
    expect(result.rescueBlocks[0].taskType).toBe("rescue_dungeon");
    expect(result.unscheduledTasks).toHaveLength(0);
  });

  it("排不进去的 missed 任务进入 unscheduledTasks", () => {
    const result = planRescueSchedule({
      tasks: [
        {
          id: "task-missed",
          goalId: "goal-1",
          title: "补救 Boss 战",
          estimatedMinutes: 90,
          difficulty: 5,
          priority: 5,
          deadline: "2026-06-20",
          taskType: "boss_battle",
          xpReward: 180,
          status: "overdue"
        }
      ],
      freeSlots: [
        {
          date: "2026-06-14",
          weekday: 7,
          totalFreeMinutes: 45,
          slots: [
            {
              startTime: "2026-06-14T12:00:00.000Z",
              endTime: "2026-06-14T12:45:00.000Z"
            }
          ]
        }
      ],
      userPreferences: {
        dailyStudyLimitMinutes: 120
      },
      dateRange: {
        startDate: "2026-06-14",
        endDate: "2026-06-20"
      }
    });

    expect(result.rescueBlocks).toHaveLength(0);
    expect(result.unscheduledTasks.map((task) => task.id)).toEqual(["task-missed"]);
  });

  it("missed 任务可以按 taskIds 单独重排", () => {
    const result = planRescueSchedule({
      mode: "tasks",
      taskIds: ["task-a"],
      tasks: [
        createTask({ id: "task-a", status: "overdue" }),
        createTask({ id: "task-b", status: "overdue" })
      ],
      existingBlocks: [],
      freeSlots: [createFreeSlot("2026-06-14T08:00:00.000Z", "2026-06-14T10:00:00.000Z")],
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-14", endDate: "2026-06-20" }
    });

    expect(result.rescueBlocks.map((block) => block.taskId)).toEqual(["task-a"]);
    expect(result.unscheduledTasks).toHaveLength(0);
  });

  it("goal 模式只重排该 Boss 的 missed 任务", () => {
    const result = planRescueSchedule({
      mode: "goal",
      goalId: "goal-a",
      tasks: [
        createTask({ id: "task-a", goalId: "goal-a", status: "overdue" }),
        createTask({ id: "task-b", goalId: "goal-b", status: "overdue" })
      ],
      existingBlocks: [],
      freeSlots: [createFreeSlot("2026-06-14T08:00:00.000Z", "2026-06-14T10:00:00.000Z")],
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-14", endDate: "2026-06-20" }
    });

    expect(result.rescueBlocks.map((block) => block.taskId)).toEqual(["task-a"]);
  });

  it("有空闲时间时不会移动未来 scheduled 任务", () => {
    const result = planRescueSchedule({
      tasks: [createTask({ id: "task-missed", status: "overdue" })],
      existingBlocks: [
        createExistingBlock({
          id: "future-block",
          taskId: "future-task",
          startTime: "2026-06-14T10:00:00.000Z",
          endTime: "2026-06-14T11:00:00.000Z",
          status: "scheduled"
        })
      ],
      freeSlots: [createFreeSlot("2026-06-14T08:00:00.000Z", "2026-06-14T12:00:00.000Z")],
      userPreferences: { dailyStudyLimitMinutes: 180 },
      dateRange: { startDate: "2026-06-14", endDate: "2026-06-20" }
    });

    expect(result.rescueBlocks).toHaveLength(1);
    expect(result.movedBlocks).toHaveLength(0);
    expect(result.unchangedBlocks.map((block) => block.id)).toEqual(["future-block"]);
    expect(result.rescueBlocks[0].startTime).toBe("2026-06-14T08:00:00.000Z");
  });

  it("没有空闲时间时才移动低优先级远 deadline 任务", () => {
    const result = planRescueSchedule({
      tasks: [createTask({ id: "task-missed", status: "overdue", priority: 5, deadline: "2026-06-15" })],
      existingBlocks: [
        createExistingBlock({
          id: "move-me",
          taskId: "future-low",
          priority: 1,
          deadline: "2026-07-20",
          startTime: "2026-06-14T08:00:00.000Z",
          endTime: "2026-06-14T09:00:00.000Z",
          status: "scheduled"
        })
      ],
      freeSlots: [createFreeSlot("2026-06-14T08:00:00.000Z", "2026-06-14T09:00:00.000Z")],
      userPreferences: { dailyStudyLimitMinutes: 120 },
      dateRange: { startDate: "2026-06-14", endDate: "2026-06-20" }
    });

    expect(result.rescueBlocks).toHaveLength(1);
    expect(result.movedBlocks.map((block) => block.id)).toEqual(["move-me"]);
    expect(result.unchangedBlocks).toHaveLength(0);
  });

  it("同一个任务不会生成多个未来 ScheduleBlock", () => {
    const result = planRescueSchedule({
      tasks: [
        createTask({ id: "task-missed", status: "overdue" }),
        createTask({ id: "task-missed", status: "pending" })
      ],
      existingBlocks: [],
      freeSlots: [createFreeSlot("2026-06-14T08:00:00.000Z", "2026-06-14T11:00:00.000Z")],
      userPreferences: { dailyStudyLimitMinutes: 180 },
      dateRange: { startDate: "2026-06-14", endDate: "2026-06-20" }
    });

    expect(result.rescueBlocks.map((block) => block.taskId)).toEqual(["task-missed"]);
  });
});

function createTask(overrides: Partial<Parameters<typeof planRescueSchedule>[0]["tasks"][number]> = {}) {
  return {
    id: "task-a",
    goalId: "goal-1",
    title: "补救训练",
    estimatedMinutes: 45,
    difficulty: 3,
    priority: 4,
    deadline: "2026-06-20",
    taskType: "elite_monster" as const,
    xpReward: 100,
    status: "overdue" as const,
    ...overrides
  };
}

function createFreeSlot(startTime: string, endTime: string) {
  const date = startTime.slice(0, 10);

  return {
    date,
    weekday: 7,
    totalFreeMinutes: Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
    slots: [{ startTime, endTime }]
  };
}

function createExistingBlock(overrides: Partial<Parameters<typeof planRescueSchedule>[0]["existingBlocks"][number]> = {}) {
  return {
    id: "block-1",
    taskId: "future-task",
    goalId: "goal-1",
    startTime: "2026-06-14T08:00:00.000Z",
    endTime: "2026-06-14T09:00:00.000Z",
    status: "scheduled" as const,
    priority: 2,
    deadline: "2026-07-01",
    ...overrides
  };
}
