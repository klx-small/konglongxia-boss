"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, Eye, Plus, Shield } from "lucide-react";

import { BossHpBar } from "@/components/boss-hp-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatRemainingDays,
  goalTypeLabels,
  statusLabels
} from "@/lib/goals/goal-format";
import { emptyStateText, errorStateText, loadingStateText } from "@/lib/ui/status-text";
import type { Goal } from "@/lib/types";

type GoalManagerProps = {
  initialGoals: Goal[];
};

type GoalsResponse = {
  goals?: Goal[];
  error?: string;
};

export function GoalManager({ initialGoals }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    requestJson<GoalsResponse>("/api/goals")
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setGoals(data.goals ?? []);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : errorStateText);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">Boss 目标</h1>
          <p className="text-sm text-muted-foreground">
            把考试、论文和考证目标包装成可挑战的 Boss。
          </p>
        </div>
        <Button asChild className="shrink-0" aria-label="创建 Boss 目标">
          <Link href="/goals/new">
            <Plus className="h-4 w-4" />
            创建
          </Link>
        </Button>
      </section>

      {isLoading ? <StatusCard text={loadingStateText} /> : null}
      {!isLoading && error ? <StatusCard tone="error" text={error} /> : null}
      {!isLoading && !error && goals.length === 0 ? (
        <StatusCard text={emptyStateText} />
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalListCard goal={goal} key={goal.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function GoalListCard({ goal }: { goal: Goal }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{goal.bossName}</CardTitle>
            <p className="text-sm text-muted-foreground">目标：{goal.title}</p>
          </div>
          <Badge variant={goal.status === "active" ? "default" : "secondary"}>
            {statusLabels[goal.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <BossHpBar
          label={`${goal.bossName}血量`}
          currentHp={goal.bossHp}
          totalHp={goal.bossMaxHp}
        />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span>{formatRemainingDays(goal.deadline)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
            <Shield className="h-4 w-4 text-primary" />
            <span>难度 {goal.difficulty} 星</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>类型：{goalTypeLabels[goal.goalType]}</span>
          <span>截止：{goal.deadline}</span>
        </div>
        <Button asChild className="w-full" variant="secondary">
          <Link href={`/goals/${goal.id}`}>
            <Eye className="h-4 w-4" />
            查看 Boss
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusCard({ text, tone = "default" }: { text: string; tone?: "default" | "error" }) {
  return (
    <Card>
      <CardContent
        className={`p-4 text-sm font-medium ${
          tone === "error" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {text}
      </CardContent>
    </Card>
  );
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "获取 Boss 目标失败，请稍后重试。");
  }

  return data;
}
