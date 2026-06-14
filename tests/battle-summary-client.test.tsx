import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleSummaryClient } from "@/components/battle-summary-client";
import type { TodayBattleData } from "@/lib/battle/today-types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const summaryData: TodayBattleData = {
  progress: {
    level: 2,
    currentXp: 120,
    nextLevelXp: 1000,
    streakDays: 3
  },
  bossGoal: null,
  hasMissedQuests: false,
  quests: [],
  missedQuests: [
    {
      id: "missed-1",
      taskId: "task-missed",
      scheduleBlockId: "missed-1",
      bossGoalId: "goal-1",
      bossName: "四级巨龙",
      title: "错过听力小怪",
      description: "这只小怪今天没打掉。",
      scheduledTimeLabel: "19:30 - 20:15",
      estimatedMinutes: 45,
      damage: 100,
      xpReward: 80,
      status: "missed",
      statusLabel: "已错过"
    }
  ],
  rescueQuests: [
    {
      id: "rescue-1",
      taskId: "task-rescue",
      scheduleBlockId: "rescue-1",
      bossGoalId: "goal-1",
      bossName: "四级巨龙",
      title: "补救听力训练",
      description: "补回错过的小怪。",
      scheduledTimeLabel: "20:30 - 21:15",
      estimatedMinutes: 45,
      damage: 100,
      xpReward: 80,
      status: "pending",
      statusLabel: "待挑战",
      source: "reschedule"
    }
  ],
  settlement: {
    date: "2026-06-13",
    totalQuestCount: 3,
    totalDamage: 120,
    totalXp: 80,
    completedQuestCount: 1,
    missedQuestCount: 1,
    bossHpRecovered: 36,
    rescueQuestCount: 1,
    movedBlockCount: 2,
    tomorrowStudyMinutes: 45,
    summary: "今天不算完美，但恐龙侠已经帮你重新规划战线。"
  }
};

describe("战斗结算页", () => {
  it("展示今日结算和补救副本", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => summaryData
      })) as unknown as typeof fetch
    );

    render(<BattleSummaryClient />);

    expect(screen.getByRole("heading", { name: "战斗结算" })).toBeInTheDocument();
    expect(await screen.findByText("错过 1 个小怪，Boss 回血 36 点。")).toBeInTheDocument();
    expect(screen.getByText("补救副本已安排到明天 20:30。")).toBeInTheDocument();
    expect(screen.getByText("恐龙侠今天帮你补救了 1 个小怪。")).toBeInTheDocument();
    expect(screen.getByText("计划没有崩，只是战线重新调整了一下。")).toBeInTheDocument();
    expect(screen.getByText("错过听力小怪")).toBeInTheDocument();
    expect(screen.getByText("补救听力训练")).toBeInTheDocument();
    expect(screen.getByText("被移动任务")).toBeInTheDocument();
    expect(screen.getByText("2 个")).toBeInTheDocument();
    expect(screen.getByText("45 分钟")).toBeInTheDocument();
  });
});
