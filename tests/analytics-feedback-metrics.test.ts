import { describe, expect, it, vi } from "vitest";

import { handleFeedbackPost } from "@/app/api/feedback/route";
import { handleInternalMetricsGet } from "@/app/api/internal/metrics/route";
import { trackEvent, type AnalyticsEventStore } from "@/lib/analytics/track-event";
import { submitFeedback, type FeedbackStore } from "@/lib/feedback/feedback-service";
import { buildInternalMetrics, type InternalMetricsStore } from "@/lib/internal/metrics";

describe("内测埋点", () => {
  it("trackEvent 写入失败时不影响主流程", async () => {
    const store: AnalyticsEventStore = {
      create: vi.fn().mockRejectedValue(new Error("database down"))
    };

    await expect(
      trackEvent({
        store,
        userId: "demo-user",
        eventName: "course_created",
        metadata: { count: 1 }
      })
    ).resolves.toBe(false);
  });

  it("trackEvent 不记录 API Key 和完整 prompt", async () => {
    const store: AnalyticsEventStore = {
      create: vi.fn().mockResolvedValue(undefined)
    };

    await trackEvent({
      store,
      userId: "demo-user",
      eventName: "ai_deepseek_failed",
      metadata: {
        source: "deepseek",
        apiKey: "secret",
        prompt: "完整提示词",
        durationMs: 1200
      }
    });

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          source: "deepseek",
          durationMs: 1200
        }
      })
    );
  });
});

describe("反馈提交", () => {
  it("content 为空时报错", async () => {
    const store: FeedbackStore = {
      create: vi.fn()
    };
    const tracker = vi.fn();

    await expect(
      submitFeedback({
        store,
        track: tracker,
        userId: "demo-user",
        input: { type: "suggestion", content: "   " }
      })
    ).rejects.toThrow("反馈内容不能为空。");
  });

  it("正常提交反馈并记录 feedback_submitted 埋点", async () => {
    const store: FeedbackStore = {
      create: vi.fn().mockResolvedValue({
        id: "feedback-1",
        userId: "demo-user",
        type: "suggestion",
        page: "/",
        content: "希望今日副本更醒目",
        contact: "",
        rating: 5,
        createdAt: new Date("2026-06-14T00:00:00.000Z")
      })
    };
    const tracker = vi.fn().mockResolvedValue(true);

    const result = await submitFeedback({
      store,
      track: tracker,
      userId: "demo-user",
      input: {
        type: "suggestion",
        page: "/",
        content: "希望今日副本更醒目",
        rating: 5
      }
    });

    expect(result.feedback.id).toBe("feedback-1");
    expect(tracker).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "feedback_submitted",
        entityType: "feedback",
        entityId: "feedback-1",
        metadata: { type: "suggestion", page: "/", rating: 5 }
      })
    );
  });

  it("/api/feedback content 为空时返回中文错误", async () => {
    const response = await handleFeedbackPost(
      new Request("http://127.0.0.1/api/feedback", {
        method: "POST",
        body: JSON.stringify({ content: "" })
      }),
      {
        ensureUser: vi.fn().mockResolvedValue(undefined),
        submit: async () => {
          throw new Error("反馈内容不能为空。");
        }
      }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("反馈内容不能为空。");
  });
});

describe("内测指标", () => {
  it("返回基础统计、AI 来源统计和 onboarding 漏斗", async () => {
    const store: InternalMetricsStore = {
      countCourses: vi.fn().mockResolvedValue(2),
      countGoals: vi.fn().mockResolvedValue(1),
      countMilestones: vi.fn().mockResolvedValue(4),
      countTasks: vi.fn().mockResolvedValue(16),
      countScheduleBlocks: vi.fn().mockResolvedValue(8),
      countCompletedTasks: vi.fn().mockResolvedValue(3),
      countMissedBlocks: vi.fn().mockResolvedValue(1),
      countRescueBlocks: vi.fn().mockResolvedValue(2),
      countBattleLogs: vi.fn().mockResolvedValue(5),
      countAnalyticsEvents: vi.fn().mockResolvedValue(12),
      countTodayAnalyticsEvents: vi.fn().mockResolvedValue(4),
      countAiEventsBySource: vi.fn().mockResolvedValue({ mock: 2, deepseek: 1, fallback: 3 })
    };

    const metrics = await buildInternalMetrics({ store, userId: "demo-user" });

    expect(metrics.courseCount).toBe(2);
    expect(metrics.aiSourceStats).toEqual({ mock: 2, deepseek: 1, fallback: 3 });
    expect(metrics.onboardingFunnel).toEqual({
      hasCourse: true,
      hasGoal: true,
      hasBattlePlan: true,
      hasSchedule: true,
      hasCompletedTask: true
    });
  });

  it("/api/internal/metrics 返回基础统计", async () => {
    const response = await handleInternalMetricsGet({
      build: async () => ({
        goalCount: 1,
        courseCount: 2,
        scheduleBlockCount: 3,
        completedTaskCount: 1,
        missedTaskCount: 0,
        rescueBlockCount: 0,
        battleLogCount: 0,
        analyticsEventCount: 4,
        todayAnalyticsEventCount: 2,
        aiSourceStats: { mock: 1, deepseek: 0, fallback: 0 },
        onboardingFunnel: {
          hasCourse: true,
          hasGoal: true,
          hasBattlePlan: true,
          hasSchedule: true,
          hasCompletedTask: true
        }
      })
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analyticsEventCount).toBe(4);
    expect(data.aiSourceStats.mock).toBe(1);
  });
});
