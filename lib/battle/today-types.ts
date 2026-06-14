import type { BattleSettlement, BossGoal, DailyQuest, UserProgress } from "@/lib/types";

export type TodayQuest = DailyQuest & {
  scheduleBlockId: string;
};

export type TodayBattleData = {
  progress: UserProgress;
  bossGoal: BossGoal | null;
  quests: TodayQuest[];
  settlement: BattleSettlement;
  hasMissedQuests?: boolean;
  missedQuests?: TodayQuest[];
  rescueQuests?: TodayQuest[];
};
