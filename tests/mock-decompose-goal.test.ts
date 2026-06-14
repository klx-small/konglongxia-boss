import { describe, expect, it } from "vitest";

import { mockDecomposeGoal } from "@/lib/goals/mock-decompose-goal";
import type { Goal } from "@/lib/types";

const baseGoal: Goal = {
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
};

describe("mockDecomposeGoal", () => {
  it("四级目标能生成词汇、听力、阅读、真题相关阶段", () => {
    const campaign = mockDecomposeGoal(baseGoal);
    const milestoneText = campaign.milestones.map((milestone) => milestone.title).join(" ");

    expect(milestoneText).toContain("词汇");
    expect(milestoneText).toContain("听力");
    expect(milestoneText).toContain("阅读");
    expect(milestoneText).toContain("真题");
    expect(campaign.tasks.length).toBeGreaterThanOrEqual(12);
  });

  it("论文目标能生成选题、资料、大纲、初稿、修改相关阶段", () => {
    const campaign = mockDecomposeGoal({
      ...baseGoal,
      id: "goal-paper",
      title: "毕业论文写作",
      goalType: "paper",
      deadline: "2026-08-01",
      bossName: "论文吞噬兽"
    });
    const milestoneText = campaign.milestones.map((milestone) => milestone.title).join(" ");

    expect(milestoneText).toContain("选题");
    expect(milestoneText).toContain("资料");
    expect(milestoneText).toContain("大纲");
    expect(milestoneText).toContain("初稿");
    expect(milestoneText).toContain("修改");
  });

  it("sprint 强度生成的任务数不少于 relaxed", () => {
    const relaxed = mockDecomposeGoal({ ...baseGoal, intensity: "relaxed" });
    const sprint = mockDecomposeGoal({ ...baseGoal, intensity: "sprint" });

    expect(sprint.tasks.length).toBeGreaterThanOrEqual(relaxed.tasks.length);
  });

  it("每个 task 都有 estimatedMinutes、difficulty、priority、xpReward", () => {
    const campaign = mockDecomposeGoal(baseGoal);

    campaign.tasks.forEach((task) => {
      expect(task.estimatedMinutes).toBeGreaterThan(0);
      expect(task.difficulty).toBeGreaterThan(0);
      expect(task.priority).toBeGreaterThan(0);
      expect(task.xpReward).toBeGreaterThan(0);
    });
  });

  it("task deadline 不晚于 goal deadline", () => {
    const campaign = mockDecomposeGoal(baseGoal);
    const goalDeadline = new Date(`${baseGoal.deadline}T00:00:00.000Z`).getTime();

    campaign.tasks.forEach((task) => {
      expect(new Date(`${task.deadline}T00:00:00.000Z`).getTime()).toBeLessThanOrEqual(goalDeadline);
    });
  });

  it("生成的 milestone order 正确递增", () => {
    const campaign = mockDecomposeGoal(baseGoal);

    expect(campaign.milestones.map((milestone) => milestone.order)).toEqual(
      campaign.milestones.map((_, index) => index + 1)
    );
  });
});
