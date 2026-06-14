import { describe, expect, it } from "vitest";

import { createBossFromGoalInput } from "@/lib/goals/create-boss";

const baseInput = {
  title: "英语四级冲刺",
  description: "准备六月四级考试",
  goalType: "certificate" as const,
  deadline: "2026-07-01",
  currentLevel: "基础一般",
  dailyAvailableMinutes: 60,
  intensity: "standard" as const
};

describe("Boss 生成逻辑", () => {
  it("四级目标生成四级巨龙", () => {
    const boss = createBossFromGoalInput(baseInput, { now: "2026-06-13" });

    expect(boss.bossName).toBe("四级巨龙");
    expect(boss.bossDescription).toContain("英语四级冲刺");
    expect(boss.bossHp).toBe(boss.bossMaxHp);
  });

  it("论文目标生成论文吞噬兽", () => {
    const boss = createBossFromGoalInput(
      { ...baseInput, title: "毕业论文初稿", goalType: "paper" },
      { now: "2026-06-13" }
    );

    expect(boss.bossName).toBe("论文吞噬兽");
  });

  it("高数目标生成高数石像鬼", () => {
    const boss = createBossFromGoalInput(
      { ...baseInput, title: "高数期末复习", goalType: "exam" },
      { now: "2026-06-13" }
    );

    expect(boss.bossName).toBe("高数石像鬼");
  });

  it("不同强度对应不同 bossHp", () => {
    const relaxed = createBossFromGoalInput(
      { ...baseInput, intensity: "relaxed" },
      { now: "2026-06-13" }
    );
    const standard = createBossFromGoalInput(baseInput, { now: "2026-06-13" });
    const sprint = createBossFromGoalInput(
      { ...baseInput, intensity: "sprint" },
      { now: "2026-06-13" }
    );

    expect(relaxed.bossMaxHp).toBeLessThan(standard.bossMaxHp);
    expect(standard.bossMaxHp).toBeLessThan(sprint.bossMaxHp);
  });

  it("截止日期越近，difficulty 越高", () => {
    const closeDeadline = createBossFromGoalInput(
      { ...baseInput, deadline: "2026-06-16" },
      { now: "2026-06-13" }
    );
    const farDeadline = createBossFromGoalInput(
      { ...baseInput, deadline: "2026-08-13" },
      { now: "2026-06-13" }
    );

    expect(closeDeadline.difficulty).toBeGreaterThan(farDeadline.difficulty);
  });
});
