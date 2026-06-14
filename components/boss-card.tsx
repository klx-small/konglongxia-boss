import { Shield, Sword } from "lucide-react";

import { BossHpBar } from "@/components/boss-hp-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BossGoal } from "@/lib/types";

type BossCardProps = {
  goal: BossGoal;
};

export function BossCard({ goal }: BossCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{goal.bossName}</CardTitle>
            <CardDescription>目标：{goal.title}</CardDescription>
            <p className="sr-only">{goal.title}</p>
          </div>
          <Badge variant={goal.riskLabel === "时间紧" ? "warning" : "secondary"}>
            {goal.riskLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{goal.description}</p>
        <BossHpBar
          label={`${goal.bossName}血量`}
          currentHp={goal.currentHp}
          totalHp={goal.totalHp}
        />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <Sword className="h-4 w-4 text-primary" />
            <span>{goal.stageSummary}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <Shield className="h-4 w-4 text-primary" />
            <span>{goal.statusLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>类型：{goal.typeLabel}</span>
          <span>优先级：{goal.priority}</span>
          <span>截止：{goal.deadlineDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}
