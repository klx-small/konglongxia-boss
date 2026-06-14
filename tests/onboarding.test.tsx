import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedbackLink } from "@/components/feedback/FeedbackLink";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { getDashboardAction, type DashboardSnapshot } from "@/lib/onboarding/status";

const emptySnapshot: DashboardSnapshot = {
  courseCount: 0,
  goalCount: 0,
  milestoneCount: 0,
  taskCount: 0,
  scheduleBlockCount: 0,
  todayQuestCount: 0,
  completedQuestCount: 0
};

describe("内测上手状态", () => {
  it("没有课程时首页引导导入课表", () => {
    expect(getDashboardAction(emptySnapshot)).toMatchObject({
      title: "先让恐龙侠侦察你的课表地图",
      buttonLabel: "导入课表",
      href: "/courses"
    });
  });

  it("有课程但没有 Boss 时首页引导创建 Boss", () => {
    expect(getDashboardAction({ ...emptySnapshot, courseCount: 2 })).toMatchObject({
      title: "课表地图已就绪，创建第一个 Boss 吧",
      buttonLabel: "创建 Boss",
      href: "/goals/new"
    });
  });

  it("有 Boss 但没有战役时首页引导生成战役", () => {
    expect(
      getDashboardAction({ ...emptySnapshot, courseCount: 2, goalCount: 1, firstGoalId: "goal-1" })
    ).toMatchObject({
      title: "Boss 已出现，生成战役吧",
      buttonLabel: "去生成战役",
      href: "/goals/goal-1"
    });
  });

  it("有任务但没有排程时首页引导生成本周副本", () => {
    expect(
      getDashboardAction({
        ...emptySnapshot,
        courseCount: 2,
        goalCount: 1,
        milestoneCount: 3,
        taskCount: 12,
        firstGoalId: "goal-1"
      })
    ).toMatchObject({
      title: "战役已拆好，生成本周副本吧",
      buttonLabel: "生成本周副本",
      href: "/goals/goal-1"
    });
  });

  it("有今日副本时首页引导开始今日副本", () => {
    expect(
      getDashboardAction({
        ...emptySnapshot,
        courseCount: 2,
        goalCount: 1,
        milestoneCount: 3,
        taskCount: 12,
        scheduleBlockCount: 5,
        todayQuestCount: 2
      })
    ).toMatchObject({
      title: "今日副本已准备好",
      buttonLabel: "开始今日副本",
      href: "/battle/today"
    });
  });

  it("OnboardingChecklist 根据状态展示完成、进行中和未开始", () => {
    render(<OnboardingChecklist snapshot={{ ...emptySnapshot, courseCount: 1 }} />);

    expect(screen.getByText("导入课表")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("创建 Boss")).toBeInTheDocument();
    expect(screen.getByText("进行中")).toBeInTheDocument();
    expect(screen.getAllByText("未开始").length).toBeGreaterThan(0);
  });

  it("FEEDBACK_URL 未配置时跳转内置反馈页", () => {
    render(<FeedbackLink />);

    expect(screen.getByRole("link", { name: "反馈问题" })).toHaveAttribute("href", "/feedback");
  });
});
