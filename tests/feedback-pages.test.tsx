import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FeedbackPage from "@/app/feedback/page";
import RootLayout from "@/app/layout";
import { BottomNav } from "@/components/bottom-nav";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";
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

  it("底部导航只在移动端显示，桌面端隐藏", () => {
    render(<BottomNav />);

    expect(screen.getByRole("navigation", { name: "主导航" })).toHaveClass("md:hidden");
    expect(screen.getByRole("navigation", { name: "主导航" })).toHaveClass("fixed");
    expect(screen.getByRole("navigation", { name: "主导航" })).toHaveClass("z-50");
  });

  it("全局 main 为移动端底部导航预留空间，桌面端取消大留白", () => {
    const { container } = render(
      <RootLayout>
        <div>页面内容</div>
      </RootLayout>
    );
    const main = container.querySelector("main");

    expect(main).toHaveClass("pb-28");
    expect(main).toHaveClass("md:pb-8");
    expect(main).toHaveClass("md:max-w-6xl");
  });

  it("Feedback 页面渲染反馈表单和足够底部 padding", () => {
    const { container } = render(<FeedbackPage />);
    const page = container.querySelector('[data-testid="feedback-page"]');

    expect(screen.getByRole("heading", { name: "内测反馈" })).toBeInTheDocument();
    expect(screen.getByLabelText("反馈内容")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交反馈" })).toBeInTheDocument();
    expect(page).toHaveClass("pb-28");
    expect(page).toHaveClass("md:pb-10");
    expect(page).toHaveClass("max-w-5xl");
  });

  it("底部反馈链接不是 fixed 或 absolute，并在移动端预留安全距离", () => {
    const { container } = render(<FeedbackLink />);
    const footer = container.querySelector("footer");

    expect(screen.getByRole("link", { name: "反馈问题" })).toHaveAttribute("href", "/feedback");
    expect(footer).toHaveClass("pb-28");
    expect(footer).toHaveClass("md:pb-8");
    expect(footer?.className).not.toContain("fixed");
    expect(footer?.className).not.toContain("absolute");
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
