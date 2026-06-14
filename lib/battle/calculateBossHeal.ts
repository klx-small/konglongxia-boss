import type { TaskType } from "@/lib/types";
import { calculateQuestBattleReward } from "@/lib/battle/rewards";

export type BossHealTask = {
  id: string;
  xpReward?: number | null;
  estimatedMinutes: number;
  difficulty: number;
  taskType: TaskType;
};

export type CalculateBossHealInput = {
  task: BossHealTask;
  bossHp: number;
  bossMaxHp: number;
  alreadyHealed: boolean;
};

export function calculateBossHeal(input: CalculateBossHealInput) {
  if (input.alreadyHealed) {
    return {
      healAmount: 0,
      nextBossHp: clampBossHp(input.bossHp, input.bossMaxHp),
      message: ""
    };
  }

  const xpReward =
    input.task.xpReward && input.task.xpReward > 0
      ? input.task.xpReward
      : calculateQuestBattleReward({
          estimatedMinutes: input.task.estimatedMinutes,
          difficulty: input.task.difficulty,
          taskType: input.task.taskType,
          xpReward: 0
        }).damage;
  const requestedHeal = Math.floor(xpReward * 0.3);
  const nextBossHp = clampBossHp(input.bossHp + requestedHeal, input.bossMaxHp);
  const healAmount = nextBossHp - clampBossHp(input.bossHp, input.bossMaxHp);

  return {
    healAmount,
    nextBossHp,
    message:
      healAmount > 0
        ? `Boss 趁你没完成任务偷偷回血了 ${healAmount} 点，不过恐龙侠已经准备补救副本。`
        : "Boss 已经满血，没有继续回血。"
  };
}

function clampBossHp(value: number, bossMaxHp: number): number {
  return Math.max(0, Math.min(value, bossMaxHp));
}
