import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TodayBattlePage from "@/app/battle/today/page";
import CoursesPage from "@/app/courses/page";
import GoalsPage from "@/app/goals/page";
import DashboardPage from "@/app/page";
import { GoalDetail } from "@/components/goal-detail";
import { GoalForm } from "@/components/goal-form";
import { ScheduleBoard } from "@/components/schedule-board";
import { loadDashboardSnapshot } from "@/lib/onboarding/dashboard-data";
import { mockCourses } from "@/lib/mock-data";
import type { TodayBattleData } from "@/lib/battle/today-types";
import type { Goal } from "@/lib/types";

vi.mock("@/lib/onboarding/dashboard-data", () => ({
  loadDashboardSnapshot: vi.fn()
}));

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush
  })
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

    expect(screen.getByText("第一次来？先一键体验恐龙侠")).toBeInTheDocument();
    expect(screen.getByText("不用填写课表，先用示例 Boss 跑完整个流程。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一键体验恐龙侠" })).toBeInTheDocument();
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
      await screen.findByText("还没有 Boss。先创建一个学习目标，恐龙侠会把它拆成战役。")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "创建第一个 Boss" })).toHaveAttribute("href", "/goals/new");
    expect(screen.getByRole("link", { name: "一键体验恐龙侠" })).toHaveAttribute("href", "/#demo");
  });

  it("创建 Boss 表单展示示例和辅助说明", () => {
    render(<GoalForm />);

    expect(screen.getByText("不知道怎么填？可以先写一个真实目标，比如‘两周后完成毛概论文初稿’。")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例如：30 天通过英语四级 / 期末高数冲刺 / 完成论文初稿")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例如：词汇薄弱，听力一般；高数基础一般，极限和导数不熟")).toBeInTheDocument();
    expect(screen.getByText("Boss 会在这个日期前进入最终战。")).toBeInTheDocument();
    expect(screen.getByText("填你愿意每天给这个目标安排的时间，例如 45 或 60 分钟。")).toBeInTheDocument();
    expect(screen.getByText("轻松：每天少量推进；普通：稳定推进；冲刺：任务更多，适合 ddl 靠近。")).toBeInTheDocument();
  });

  it("本周路线没有排程时展示明确下一步", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/api/goals")) {
          return {
            ok: true,
            json: async () => ({
              goals: [
                {
                  ...mockGoals[0],
                  id: "goal-with-tasks",
                  tasks: [
                    {
                      id: "task-1",
                      goalId: "goal-with-tasks",
                      milestoneId: "milestone-1",
                      title: "词汇小怪",
                      description: "背单词",
                      estimatedMinutes: 25,
                      difficulty: 1,
                      priority: 4,
                      deadline: "2026-07-01",
                      taskType: "small_monster",
                      xpReward: 30,
                      status: "pending"
                    }
                  ]
                }
              ]
            })
          };
        }

        return {
          ok: true,
          json: async () => ({ scheduleBlocks: [], courses: [], unscheduledTasks: [] })
        };
      }) as unknown as typeof fetch
    );

    render(<ScheduleBoard />);

    expect(
      await screen.findByText("还没有本周副本。先进入 Boss 详情页生成战役和本周副本。")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去生成本周副本" })).toHaveAttribute("href", "/goals/goal-with-tasks");
  });

  it("Boss 详情页生成战役成功后不显示技术来源词", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = String(input);

        if (url.includes("/decompose") && options?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ goal: mockGoals[0], source: "fallback" })
          };
        }

        return {
          ok: true,
          json: async () => ({ goal: mockGoals[0] })
        };
      }) as unknown as typeof fetch
    );

    render(<GoalDetail goalId="goal-cet4" />);

    await screen.findByRole("heading", { level: 1, name: "四级巨龙" });
    fireEvent.click(screen.getByRole("button", { name: "生成战役" }));

    expect(await screen.findByText("恐龙侠已为你生成 Boss 战役。")).toBeInTheDocument();
    expect(screen.queryByText(/本地模板|DeepSeek|fallback/)).not.toBeInTheDocument();
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
