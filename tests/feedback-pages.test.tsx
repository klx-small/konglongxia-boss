import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FeedbackPage from "@/app/feedback/page";
import { InternalChecklist } from "@/components/internal/InternalChecklist";

describe("反馈与内测检查页面", () => {
  it("/feedback 页面能提交反馈", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ message: "收到啦，恐龙侠会认真看你的反馈。" })
      })) as unknown as typeof fetch
    );

    render(<FeedbackPage />);

    fireEvent.change(screen.getByLabelText("反馈内容"), {
      target: { value: "希望补救副本能更明显一点。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交反馈" }));

    expect(await screen.findByText("收到啦，恐龙侠会认真看你的反馈。")).toBeInTheDocument();
  });

  it("/internal/checklist 能显示检查项", () => {
    render(
      <InternalChecklist
        data={{
          databaseOk: true,
          healthOk: true,
          hasCourse: true,
          hasGoal: true,
          hasBattlePlan: true,
          hasSchedule: true,
          hasTodayQuest: true,
          canSubmitFeedback: true,
          hasAnalyticsEvent: true,
          aiProvider: "mock",
          deepSeekKeyStatus: "未配置"
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "内测检查清单" })).toBeInTheDocument();
    expect(screen.getByText("数据库连接")).toBeInTheDocument();
    expect(screen.getByText("AI_PROVIDER：mock")).toBeInTheDocument();
  });
});
