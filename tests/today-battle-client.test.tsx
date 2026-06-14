import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodayBattleClient } from "@/components/today-battle-client";
import type { TodayBattleData } from "@/lib/battle/today-types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const pendingTodayData: TodayBattleData = {
  progress: {
    level: 1,
    currentXp: 980,
    nextLevelXp: 1000,
    streakDays: 0
  },
  bossGoal: {
    id: "goal-1",
    title: "英语四级冲刺",
    typeLabel: "考证",
    bossName: "四级巨龙",
    description: "今日集中清理听力小怪。",
    deadlineDate: "2026-07-20",
    totalHp: 1000,
    currentHp: 800,
    priority: 4,
    statusLabel: "战斗中",
    stageSummary: "今日战斗中",
    riskLabel: "稳定推进"
  },
  quests: [
    {
      id: "quest-1",
      taskId: "task-1",
      scheduleBlockId: "block-1",
      bossGoalId: "goal-1",
      bossName: "四级巨龙",
      title: "听力小怪清理",
      description: "完成一组听力训练并复盘错因。",
      scheduledTimeLabel: "19:30 - 20:15",
      estimatedMinutes: 45,
      damage: 120,
      xpReward: 50,
      status: "pending",
      statusLabel: "待挑战"
    }
  ],
  hasMissedQuests: false,
  rescueQuests: [],
  settlement: {
    date: "2026-06-13",
    totalDamage: 0,
    totalXp: 0,
    completedQuestCount: 0,
    missedQuestCount: 0,
    bossHpRecovered: 0,
    summary: "今天还没有完成副本，先挑一个小怪开打吧。"
  }
};

const completedTodayData: TodayBattleData = {
  ...pendingTodayData,
  progress: {
    level: 2,
    currentXp: 30,
    nextLevelXp: 1000,
    streakDays: 1
  },
  bossGoal: {
    ...pendingTodayData.bossGoal,
    currentHp: 680
  },
  quests: [
    {
      ...pendingTodayData.quests[0],
      status: "completed",
      statusLabel: "已完成"
    }
  ],
  settlement: {
    date: "2026-06-13",
    totalDamage: 120,
    totalXp: 50,
    completedQuestCount: 1,
    missedQuestCount: 0,
    bossHpRecovered: 0,
    summary: "今日完成 1 个副本，造成 120 伤害，获得 50 XP。"
  }
};

describe("今日副本真实闭环", () => {
  it("加载今日副本并在完成后刷新战斗反馈", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => pendingTodayData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => completedTodayData
        }) as unknown as typeof fetch
    );

    render(<TodayBattleClient />);

    expect(screen.getByText("恐龙侠正在加载战斗情报...")).toBeInTheDocument();
    expect(await screen.findByText("听力小怪清理")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "完成听力小怪清理" }));

    expect(await screen.findByText("恐龙侠已完成攻击，Boss 掉血了！")).toBeInTheDocument();
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
    expect(screen.getByText("今日完成 1 个副本，造成 120 伤害，获得 50 XP。")).toBeInTheDocument();
  });

  it("展示 missed 状态并在点击后生成补救副本成功提示", async () => {
    const missedData: TodayBattleData = {
      ...pendingTodayData,
      hasMissedQuests: true,
      quests: [
        {
          ...pendingTodayData.quests[0],
          status: "missed",
          statusLabel: "已错过"
        }
      ],
      rescueQuests: [],
      settlement: {
        ...pendingTodayData.settlement,
        missedQuestCount: 1,
        bossHpRecovered: 36,
        summary: "今日完成 0 个副本，造成 0 伤害，获得 0 XP，还有 1 个副本需要重新安排，Boss 回血 36 点。"
      }
    };
    const rescuedData: TodayBattleData = {
      ...missedData,
      hasMissedQuests: false,
      rescueQuests: [
        {
          ...pendingTodayData.quests[0],
          id: "rescue-1",
          scheduleBlockId: "rescue-1",
          status: "pending",
          statusLabel: "待挑战",
          source: "reschedule"
        }
      ]
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => missedData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "恐龙侠已重新规划战线，补救副本已生成。",
            rescueBlocks: [{ id: "rescue-1" }],
            movedBlocks: [],
            unchangedBlocks: [{ id: "future-1" }, { id: "future-2" }],
            unscheduledTasks: []
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => rescuedData
        }) as unknown as typeof fetch
    );

    render(<TodayBattleClient />);

    expect(await screen.findByText("已错过")).toBeInTheDocument();
    expect(screen.getByText("有任务错过了，恐龙侠可以帮你生成补救副本。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成补救副本" }));

    expect(await screen.findByText("恐龙侠已重新规划战线，补救副本已生成。")).toBeInTheDocument();
    expect(screen.getByText("本次补救新增 1 个副本，未打乱其他任务。")).toBeInTheDocument();
  });

  it("missed 任务显示单个补救按钮并展示重排影响", async () => {
    const missedData: TodayBattleData = {
      ...pendingTodayData,
      hasMissedQuests: true,
      quests: [
        {
          ...pendingTodayData.quests[0],
          status: "missed",
          statusLabel: "已错过"
        }
      ]
    };
    const rescuedData: TodayBattleData = {
      ...missedData,
      hasMissedQuests: false
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => missedData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: "恐龙侠已为这个小怪安排补救副本。",
            rescueBlocks: [{ id: "rescue-1" }],
            movedBlocks: [{ id: "moved-1" }, { id: "moved-2" }],
            unchangedBlocks: [{ id: "unchanged-1" }],
            unscheduledTasks: [{ id: "unscheduled-1" }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => rescuedData
        }) as unknown as typeof fetch
    );

    render(<TodayBattleClient />);

    expect(await screen.findByRole("button", { name: "补救听力小怪清理" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "补救听力小怪清理" }));

    expect(await screen.findByText("恐龙侠已为这个小怪安排补救副本。")).toBeInTheDocument();
    expect(screen.getByText("本次补救移动了 2 个未来任务，已尽量保持原计划稳定。")).toBeInTheDocument();
    expect(screen.getByText("有 1 个任务暂时没有找到合适时间，建议增加可学习时间。")).toBeInTheDocument();
  });
});
