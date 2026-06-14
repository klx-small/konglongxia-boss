"use client";

import { Timer } from "lucide-react";

import { TaskMonsterCard } from "@/components/task-monster-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyQuest } from "@/lib/types";

type TodayDungeonProps = {
  quests: DailyQuest[];
  heading?: string;
  isCompletingQuestId?: string;
  isReschedulingQuestId?: string;
  onCompleteQuest?: (questId: string) => void;
  onRescueQuest?: (taskId: string) => void;
};

export function TodayDungeon({
  quests,
  heading = "今日副本",
  isCompletingQuestId = "",
  isReschedulingQuestId = "",
  onCompleteQuest,
  onRescueQuest
}: TodayDungeonProps) {
  const totalMinutes = quests.reduce((sum, quest) => sum + quest.estimatedMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{heading}</CardTitle>
            <CardDescription>按课表空闲时间生成的今日计划</CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-semibold">
            <Timer className="h-3.5 w-3.5 text-primary" />
            {totalMinutes} 分钟
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            今天还没有副本，先去 Boss 详情页生成本周副本吧。
          </p>
        ) : (
          quests.map((quest) => (
            <TaskMonsterCard
              isCompleting={isCompletingQuestId === quest.id}
              isRescheduling={isReschedulingQuestId === (quest.taskId ?? quest.id)}
              key={quest.id}
              onComplete={onCompleteQuest}
              onRescue={onRescueQuest}
              quest={quest}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
