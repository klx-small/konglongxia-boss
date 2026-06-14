import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TodayBattlePage from "@/app/battle/today/page";
import CoursesPage from "@/app/courses/page";
import GoalsPage from "@/app/goals/page";
import DashboardPage from "@/app/page";
import { loadDashboardSnapshot } from "@/lib/onboarding/dashboard-data";
import { mockCourses } from "@/lib/mock-data";
import type { TodayBattleData } from "@/lib/battle/today-types";
import type { Goal } from "@/lib/types";

vi.mock("@/lib/onboarding/dashboard-data", () => ({
  loadDashboardSnapshot: vi.fn()
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const mockGoals: Goal[] = [
  {
    id: "goal-cet4",
    userId: "demo-user",
    title: "英语四级冲刺",
    description: "准备六月四级考试",
    goalType: "certificate",
    deadline: "2026-07-01",
    currentLevel: "基础一般",
    dailyAvailableMinutes: 60,
    intensity: "standard",
    status: "active",
    bossName: "四级巨龙",
    bossHp: 1200,
    bossMaxHp: 1200,
    difficulty: 2,
    bossDescription: "「英语四级冲刺」已经变成 四级巨龙。难度 2 星，准备开始战役。"
  }
];

const mockTodayBattleData: TodayBattleData = {
  progress: {
    level: 6,
    currentXp: 760,
    nextLevelXp: 1000,
    streakDays: 5
  },
  bossGoal: {
    id: "goal-math-final",
    title: "高等数学期末复习",
    typeLabel: "考试",
    bossName: "高数期末巨龙",
    description: "三周内完成高数核心章节复习和错题回炉。",
    deadlineDate: "2026-07-05",
    totalHp: 1200,
    currentHp: 760,
    priority: 5,
    statusLabel: "战斗中",
    stageSummary: "今日 1 个副本",
    riskLabel: "中等风险"
  },
  quests: [
    {
      id: "quest-limit",
      scheduleBlockId: "quest-limit",
      bossGoalId: "goal-math-final",
      bossName: "高数期末巨龙",
      title: "复习极限与连续",
      description: "整理定义、典型题和本周错题，完成 8 道基础题。",
      scheduledTimeLabel: "19:30 - 20:30",
      estimatedMinutes: 60,
      damage: 120,
      xpReward: 60,
      status: "pending",
      statusLabel: "待挑战"
    }
  ],
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

describe("基础页面", () => {
  it("首页展示下一步行动中心", async () => {
    vi.mocked(loadDashboardSnapshot).mockResolvedValueOnce({
      courseCount: 0,
      goalCount: 0,
      milestoneCount: 0,
      taskCount: 0,
      scheduleBlockCount: 0,
      todayQuestCount: 0,
      completedQuestCount: 0
    });

    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "下一步行动中心" })).toBeInTheDocument();
    expect(screen.getByText("先让恐龙侠侦察你的课表地图")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /导入课表/ })).toHaveAttribute("href", "/courses");
  });

  it("课表页展示课程模块", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ courses: mockCourses })
      })) as unknown as typeof fetch
    );

    render(<CoursesPage />);

    expect(screen.getByRole("heading", { name: "课表" })).toBeInTheDocument();
    expect(screen.getByText("课程时间不可移动，副本只能排在空闲时间。")).toBeInTheDocument();
    expect(screen.getByText("恐龙侠正在加载战斗情报...")).toBeInTheDocument();
    expect((await screen.findAllByText("高等数学")).length).toBeGreaterThan(0);
  });

  it("目标页展示 Boss 目标列表", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ goals: mockGoals })
      })) as unknown as typeof fetch
    );

    render(<GoalsPage />);

    expect(screen.getByRole("heading", { name: "Boss 目标" })).toBeInTheDocument();
    expect(screen.getByText("恐龙侠正在加载战斗情报...")).toBeInTheDocument();
    expect(await screen.findByText("四级巨龙")).toBeInTheDocument();
    expect(screen.getByText("目标：英语四级冲刺")).toBeInTheDocument();
  });

  it("目标页在没有 Boss 目标时展示空状态", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ goals: [] })
      })) as unknown as typeof fetch
    );

    render(<GoalsPage />);

    expect(
      await screen.findByText("这里还没有内容，恐龙侠正在等你开启第一场战役。")
    ).toBeInTheDocument();
  });

  it("今日副本页展示战斗计划", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => mockTodayBattleData
      })) as unknown as typeof fetch
    );

    render(<TodayBattlePage />);

    expect(screen.getByRole("heading", { name: "今日副本" })).toBeInTheDocument();
    expect(screen.getByText("完成副本后，恐龙侠会攻击 Boss 并获得 XP。")).toBeInTheDocument();
    expect(await screen.findByText("复习极限与连续")).toBeInTheDocument();
  });
});
