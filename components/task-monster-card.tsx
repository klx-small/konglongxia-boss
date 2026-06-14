"use client";

import { CheckCircle2, Clock, RotateCcw, Swords } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DailyQuest } from "@/lib/types";

type TaskMonsterCardProps = {
  quest: DailyQuest;
  isCompleting?: boolean;
  isRescheduling?: boolean;
  onComplete?: (questId: string) => void;
  onRescue?: (taskId: string) => void;
};

export function TaskMonsterCard({
  quest,
  isCompleting = false,
  isRescheduling = false,
  onComplete,
  onRescue
}: TaskMonsterCardProps) {
  const isCompleted = quest.status === "completed";
  const isMissed = quest.status === "missed";

  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary">对战：{quest.bossName}</p>
          <h3 className="text-base font-semibold">{quest.title}</h3>
        </div>
        <Badge variant={quest.status === "pending" ? "warning" : "secondary"}>
          {quest.statusLabel}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{quest.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>预计 {quest.estimatedMinutes} 分钟</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-2">
          <Swords className="h-4 w-4 text-primary" />
          <span>造成 {quest.damage} 伤害</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-primary">+{quest.xpReward} XP</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isMissed ? (
            <Button
              aria-label={`补救${quest.title}`}
              disabled={isRescheduling}
              onClick={() => onRescue?.(quest.taskId ?? quest.id)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <RotateCcw className="h-4 w-4" />
              {isRescheduling ? "规划中" : "补救这个小怪"}
            </Button>
          ) : null}
          <Button
            aria-label={`完成${quest.title}`}
            disabled={isCompleted || isMissed || isCompleting}
            onClick={() => onComplete?.(quest.id)}
            size="sm"
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isCompleted ? "已完成" : isCompleting ? "结算中" : "完成"}
          </Button>
        </div>
      </div>
    </article>
  );
}
