import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BossCard } from "@/components/boss-card";
import { BossHpBar } from "@/components/boss-hp-bar";
import { CourseTable } from "@/components/course-table";
import { TaskMonsterCard } from "@/components/task-monster-card";
import { TodayDungeon } from "@/components/today-dungeon";
import { XpBar } from "@/components/xp-bar";
import {
  mockBossGoals,
  mockCourses,
  mockTodayQuests,
  mockUserProgress
} from "@/lib/mock-data";

describe("基础游戏化组件", () => {
  it("展示 Boss 卡片中的目标、血量和截止日期", () => {
    render(<BossCard goal={mockBossGoals[0]} />);

    expect(screen.getByText("高数期末巨龙")).toBeInTheDocument();
    expect(screen.getByText("目标：高等数学期末复习")).toBeInTheDocument();
    expect(screen.getByText("截止：2026-07-05")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "高数期末巨龙血量" })).toHaveAttribute(
      "aria-valuenow",
      "760"
    );
  });

  it("展示 Boss 血量条的当前血量和百分比", () => {
    render(<BossHpBar label="Boss 血量" currentHp={420} totalHp={1200} />);

    expect(screen.getByRole("progressbar", { name: "Boss 血量" })).toHaveAttribute(
      "aria-valuenow",
      "420"
    );
    expect(screen.getByText("420 / 1200 HP")).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
  });

  it("展示课表中的课程、周几和时间", () => {
    render(<CourseTable courses={mockCourses} />);

    expect(screen.getByRole("heading", { name: "本周课表" })).toBeInTheDocument();
    expect(screen.getByText("周一")).toBeInTheDocument();
    expect(screen.getByText("高等数学")).toBeInTheDocument();
    expect(screen.getByText("08:30 - 10:05")).toBeInTheDocument();
  });

  it("展示今日副本列表和每个任务怪", () => {
    render(<TodayDungeon quests={mockTodayQuests} />);

    expect(screen.getByRole("heading", { name: "今日副本" })).toBeInTheDocument();
    expect(screen.getByText("复习极限与连续")).toBeInTheDocument();
    expect(screen.getByText("造成 120 伤害")).toBeInTheDocument();
    expect(screen.getByText("+60 XP")).toBeInTheDocument();
  });

  it("展示单个任务怪卡片的状态、时长和奖励", () => {
    render(<TaskMonsterCard quest={mockTodayQuests[0]} />);

    expect(screen.getByText("复习极限与连续")).toBeInTheDocument();
    expect(screen.getByText("预计 60 分钟")).toBeInTheDocument();
    expect(screen.getByText("待挑战")).toBeInTheDocument();
  });

  it("展示 XP 等级进度", () => {
    render(<XpBar progress={mockUserProgress} />);

    expect(screen.getByText("Lv. 6")).toBeInTheDocument();
    expect(screen.getByText("760 / 1000 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "经验值进度" })).toHaveAttribute(
      "aria-valuenow",
      "760"
    );
  });
});

