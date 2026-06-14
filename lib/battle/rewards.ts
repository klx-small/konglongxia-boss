import type { TaskType } from "@/lib/types";

export type QuestRewardInput = {
  estimatedMinutes: number;
  difficulty: number;
  taskType: TaskType;
  xpReward: number;
};

export type QuestBattleReward = {
  damage: number;
  xpReward: number;
};

const taskTypeDamageBonus: Record<TaskType, number> = {
  small_monster: 20,
  elite_monster: 50,
  daily_dungeon: 25,
  boss_battle: 95,
  rescue_dungeon: 15
};

export function calculateQuestBattleReward(input: QuestRewardInput): QuestBattleReward {
  const difficultyDamage = input.difficulty * 15;
  const damage = input.estimatedMinutes + difficultyDamage + taskTypeDamageBonus[input.taskType];

  return {
    damage: Math.max(25, damage),
    xpReward: input.xpReward
  };
}

export function applyBossDamage({
  currentHp,
  damage
}: {
  currentHp: number;
  maxHp: number;
  damage: number;
}) {
  const nextHp = Math.max(0, currentHp - damage);

  return {
    nextHp,
    actualDamage: currentHp - nextHp,
    isDefeated: nextHp === 0
  };
}

export function applyXpReward({
  currentTotalXp,
  xpReward
}: {
  currentTotalXp: number;
  xpReward: number;
}) {
  const totalXp = currentTotalXp + xpReward;

  return {
    totalXp,
    level: Math.floor(totalXp / 1000) + 1,
    currentXp: totalXp % 1000,
    nextLevelXp: 1000
  };
}

export function createSettlementSummary({
  completedQuestCount,
  missedQuestCount,
  totalDamage,
  totalXp,
  bossHpRecovered
}: {
  completedQuestCount: number;
  missedQuestCount: number;
  totalDamage: number;
  totalXp: number;
  bossHpRecovered: number;
}) {
  if (completedQuestCount === 0 && missedQuestCount === 0) {
    return "今天还没有完成副本，先挑一个小怪开打吧。";
  }

  const missedText =
    missedQuestCount > 0 ? `，还有 ${missedQuestCount} 个副本需要重新安排` : "";
  const recoveryText = bossHpRecovered > 0 ? `，Boss 回血 ${bossHpRecovered} 点` : "";

  return `今日完成 ${completedQuestCount} 个副本，造成 ${totalDamage} 伤害，获得 ${totalXp} XP${missedText}${recoveryText}。`;
}
