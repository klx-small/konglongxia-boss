import { describe, expect, it } from "vitest";

import {
  applyBossDamage,
  applyXpReward,
  calculateQuestBattleReward,
  createSettlementSummary
} from "@/lib/battle/rewards";

describe("今日副本游戏化规则", () => {
  it("根据任务时长、难度和类型计算伤害与 XP", () => {
    const reward = calculateQuestBattleReward({
      estimatedMinutes: 45,
      difficulty: 4,
      taskType: "elite_monster",
      xpReward: 120
    });

    expect(reward.xpReward).toBe(120);
    expect(reward.damage).toBe(155);
  });

  it("Boss 战任务有额外伤害加成", () => {
    const reward = calculateQuestBattleReward({
      estimatedMinutes: 60,
      difficulty: 5,
      taskType: "boss_battle",
      xpReward: 150
    });

    expect(reward.damage).toBe(230);
  });

  it("完成副本会扣除 Boss 血量，且不会低于 0", () => {
    const result = applyBossDamage({
      currentHp: 80,
      maxHp: 1000,
      damage: 155
    });

    expect(result.nextHp).toBe(0);
    expect(result.actualDamage).toBe(80);
    expect(result.isDefeated).toBe(true);
  });

  it("获得 XP 后会计算新的等级进度", () => {
    const progress = applyXpReward({
      currentTotalXp: 980,
      xpReward: 50
    });

    expect(progress.totalXp).toBe(1030);
    expect(progress.level).toBe(2);
    expect(progress.currentXp).toBe(30);
    expect(progress.nextLevelXp).toBe(1000);
  });

  it("生成鼓励式中文结算文案", () => {
    const summary = createSettlementSummary({
      completedQuestCount: 2,
      missedQuestCount: 0,
      totalDamage: 240,
      totalXp: 160,
      bossHpRecovered: 0
    });

    expect(summary).toContain("完成 2 个副本");
    expect(summary).toContain("造成 240 伤害");
    expect(summary).toContain("获得 160 XP");
  });
});
