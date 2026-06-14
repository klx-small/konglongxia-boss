import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { handleFeedbackExportGet } from "@/app/api/internal/feedback/export/route";
import { handleInternalAnalyticsGet } from "@/app/api/internal/analytics/route";
import { InternalAnalyticsDashboard } from "@/components/internal/InternalAnalyticsDashboard";
import { InternalTestPlan } from "@/components/internal/InternalTestPlan";
import {
  buildInternalAnalytics,
  type InternalAnalyticsEvent,
  type InternalAnalyticsFeedback,
  type InternalAnalyticsStore
} from "@/lib/internal/analytics";

const emptyStore: InternalAnalyticsStore = {
  findEvents: vi.fn().mockResolvedValue([]),
  findFeedback: vi.fn().mockResolvedValue([])
};

describe("内测观察分析", () => {
  it("/api/internal/analytics 空数据时正常返回 0", async () => {
    const data = await buildInternalAnalytics({
      store: emptyStore,
      now: new Date("2026-06-14T12:00:00.000Z")
    });

    expect(data.funnel.courseCreated).toBe(0);
    expect(data.ai.fallbackRate).toBe(0);
    expect(data.battle.rescueUsageRate).toBe(0);
    expect(data.eventsByDay).toEqual([]);
    expect(data.recentFeedback).toEqual([]);
  });

  it("有 AnalyticsEvent 时能统计 funnel", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([
        event("course_created"),
        event("course_imported"),
        event("goal_created"),
        event("battle_plan_generated", { source: "mock" }),
        event("schedule_generated"),
        event("today_battle_viewed"),
        event("task_completed")
      ]),
      now: new Date("2026-06-14T12:00:00.000Z")
    });

    expect(data.funnel).toMatchObject({
      courseCreated: 2,
      goalCreated: 1,
      battlePlanGenerated: 1,
      scheduleGenerated: 1,
      todayBattleViewed: 1,
      taskCompleted: 1
    });
  });

  it("fallbackRate 计算正确", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([
        event("battle_plan_generated", { source: "deepseek" }),
        event("battle_plan_generated", { source: "fallback" }),
        event("ai_deepseek_failed", { source: "deepseek" })
      ])
    });

    expect(data.ai.deepseek).toBe(1);
    expect(data.ai.fallback).toBe(1);
    expect(data.ai.deepseekFailed).toBe(1);
    expect(data.ai.fallbackRate).toBe(50);
  });

  it("rescueUsageRate 计算正确", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([event("task_missed"), event("task_missed"), event("rescue_generated")])
    });

    expect(data.battle.taskMissed).toBe(2);
    expect(data.battle.rescueGenerated).toBe(1);
    expect(data.battle.rescueUsageRate).toBe(50);
  });

  it("eventsByDay 聚合正确", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([
        event("goal_created", {}, "2026-06-13T10:00:00.000Z"),
        event("task_completed", {}, "2026-06-13T11:00:00.000Z"),
        event("task_completed", {}, "2026-06-14T11:00:00.000Z")
      ])
    });

    expect(data.eventsByDay).toEqual([
      { date: "2026-06-13", count: 2 },
      { date: "2026-06-14", count: 1 }
    ]);
  });

  it("recentFeedback 不暴露完整 contact 且截断内容", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([], [
        {
          id: "feedback-1",
          type: "suggestion",
          page: "/battle/today",
          content: "这是一条很长的反馈".repeat(20),
          contact: "student@example.com",
          rating: 5,
          createdAt: new Date("2026-06-14T10:00:00.000Z")
        }
      ])
    });

    expect(data.recentFeedback[0]).not.toHaveProperty("contact");
    expect(data.recentFeedback[0].contactFilled).toBe(true);
    expect(data.recentFeedback[0].content.length).toBeLessThanOrEqual(100);
  });

  it("userStats 能统计用户漏斗并按最近活跃排序", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([
        event("course_created", {}, "2026-06-13T10:00:00.000Z", "user-a"),
        event("goal_created", {}, "2026-06-13T11:00:00.000Z", "user-a"),
        event("battle_plan_generated", {}, "2026-06-13T12:00:00.000Z", "user-a"),
        event("schedule_generated", {}, "2026-06-13T13:00:00.000Z", "user-a"),
        event("today_battle_viewed", {}, "2026-06-13T14:00:00.000Z", "user-a"),
        event("task_completed", {}, "2026-06-13T15:00:00.000Z", "user-a"),
        event("feedback_submitted", {}, "2026-06-13T16:00:00.000Z", "user-a"),
        event("goal_created", {}, "2026-06-14T12:00:00.000Z", "user-b")
      ]),
      now: new Date("2026-06-14T13:00:00.000Z")
    });

    expect(data.userStats[0]).toMatchObject({
      userId: "user-b",
      eventCount: 1,
      hasGoal: true,
      hasCourse: false
    });
    expect(data.userStats[1]).toMatchObject({
      userId: "user-a",
      eventCount: 7,
      hasCourse: true,
      hasGoal: true,
      hasBattlePlan: true,
      hasSchedule: true,
      hasViewedTodayBattle: true,
      hasCompletedTask: true,
      hasSubmittedFeedback: true
    });
  });

  it("anomalies 能识别 fallback、bug 反馈、missed 过多和未排入任务", async () => {
    const data = await buildInternalAnalytics({
      store: createStore(
        [
          event("ai_fallback_used"),
          event("ai_deepseek_failed"),
          event("task_missed"),
          event("task_missed"),
          event("task_completed"),
          event("schedule_generated", { unscheduledCount: 2 })
        ],
        [
          {
            id: "feedback-bug",
            type: "bug",
            page: "/schedule",
            content: "排程卡住了",
            contact: null,
            rating: 2,
            createdAt: new Date("2026-06-14T10:00:00.000Z")
          }
        ]
      )
    });

    expect(data.anomalies.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "ai_fallback_used",
        "ai_deepseek_failed",
        "task_missed_gt_completed",
        "bug_feedback",
        "schedule_unscheduled"
      ])
    );
  });

  it("dailyComparison 能计算今日与昨日差异", async () => {
    const data = await buildInternalAnalytics({
      store: createStore(
        [
          event("goal_created", {}, "2026-06-13T10:00:00.000Z"),
          event("task_completed", {}, "2026-06-13T11:00:00.000Z"),
          event("goal_created", {}, "2026-06-14T10:00:00.000Z"),
          event("task_completed", {}, "2026-06-14T11:00:00.000Z"),
          event("task_completed", {}, "2026-06-14T12:00:00.000Z")
        ],
        [
          feedback("feedback-yesterday", "suggestion", "2026-06-13T10:00:00.000Z"),
          feedback("feedback-today", "like", "2026-06-14T10:00:00.000Z"),
          feedback("feedback-today-2", "bug", "2026-06-14T11:00:00.000Z")
        ]
      ),
      now: new Date("2026-06-14T13:00:00.000Z")
    });

    expect(data.dailyComparison).toEqual({
      todayEventCount: 3,
      yesterdayEventCount: 2,
      eventDelta: 1,
      todayCompletedTasks: 2,
      yesterdayCompletedTasks: 1,
      completedTaskDelta: 1,
      todayFeedbackCount: 2,
      yesterdayFeedbackCount: 1,
      feedbackDelta: 1
    });
  });

  it("/api/internal/feedback/export 返回 CSV 且不包含完整 contact", async () => {
    const response = await handleFeedbackExportGet(new Request("http://127.0.0.1/api/internal/feedback/export"), {
      findFeedback: async () => [
        {
          id: "feedback-1",
          userId: "demo-user",
          type: "suggestion",
          page: "/battle/today",
          content: "这里有逗号, 和换行\n第二行",
          contact: "student@example.com",
          rating: 4,
          createdAt: new Date("2026-06-14T10:00:00.000Z")
        }
      ]
    });
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain("createdAt,type,rating,page,content,hasContact");
    expect(csv).toContain('"这里有逗号, 和换行\n第二行"');
    expect(csv).toContain(",true");
    expect(csv).not.toContain("student@example.com");
  });

  it("/api/internal/analytics 返回分析结构", async () => {
    const response = await handleInternalAnalyticsGet(
      new Request("http://127.0.0.1/api/internal/analytics?days=7"),
      {
        build: async () =>
          buildInternalAnalytics({
            store: createStore([event("goal_created")])
          })
      }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.funnel.goalCreated).toBe(1);
  });

  it("/internal/analytics 页面能渲染主要模块", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([event("goal_created"), event("task_completed")], [
        {
          id: "feedback-1",
          type: "like",
          page: "/",
          content: "很好用",
          contact: null,
          rating: 5,
          createdAt: new Date("2026-06-14T10:00:00.000Z")
        }
      ])
    });

    render(<InternalAnalyticsDashboard data={data} />);

    expect(screen.getByRole("heading", { name: "内测观察面板" })).toBeInTheDocument();
    expect(screen.getByText("Onboarding 漏斗")).toBeInTheDocument();
    expect(screen.getByText("AI 稳定性")).toBeInTheDocument();
    expect(screen.getByText("最近反馈")).toBeInTheDocument();
  });

  it("/internal/analytics 能显示用户漏斗表和异常提醒", async () => {
    const data = await buildInternalAnalytics({
      store: createStore([event("ai_fallback_used"), event("goal_created")])
    });

    render(<InternalAnalyticsDashboard data={data} />);

    expect(screen.getByText("用户漏斗表")).toBeInTheDocument();
    expect(screen.getByText("内测异常提醒")).toBeInTheDocument();
    expect(screen.getAllByText("ai_fallback_used").length).toBeGreaterThan(0);
  });

  it("/internal/test-plan 能渲染任务清单", () => {
    render(<InternalTestPlan />);

    expect(screen.getByRole("heading", { name: "恐龙侠内测体验任务" })).toBeInTheDocument();
    expect(screen.getByText("请按顺序体验 15 分钟，最后留一条反馈")).toBeInTheDocument();
    expect(screen.getByText(/点击“一键体验恐龙侠”/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "提交反馈" })).toHaveAttribute("href", "/feedback");
    expect(screen.queryByRole("link", { name: "Debug" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Analytics" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Readiness" })).not.toBeInTheDocument();
  });
});

function createStore(
  events: InternalAnalyticsEvent[],
  feedback: InternalAnalyticsFeedback[] = []
): InternalAnalyticsStore {
  return {
    findEvents: vi.fn().mockResolvedValue(events),
    findFeedback: vi.fn().mockResolvedValue(feedback)
  };
}

function event(
  eventName: string,
  metadata: Record<string, string | number | boolean> = {},
  createdAt = "2026-06-14T10:00:00.000Z",
  userId = "demo-user"
): InternalAnalyticsEvent {
  return {
    id: `${eventName}-${createdAt}-${userId}`,
    userId,
    eventName,
    entityType: "test",
    entityId: null,
    metadata,
    createdAt: new Date(createdAt)
  };
}

function feedback(
  id: string,
  type: InternalAnalyticsFeedback["type"],
  createdAt: string
): InternalAnalyticsFeedback {
  return {
    id,
    type,
    page: "/feedback",
    content: "测试反馈",
    contact: null,
    rating: 5,
    createdAt: new Date(createdAt)
  };
}
