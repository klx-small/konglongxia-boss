"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarClock, Clock, Route, Shield, Sparkles, Swords } from "lucide-react";

import { BossHpBar } from "@/components/boss-hp-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatRemainingDays,
  goalTypeLabels,
  intensityLabels,
  statusLabels,
  taskTypeLabels
} from "@/lib/goals/goal-format";
import { errorStateText, loadingStateText } from "@/lib/ui/status-text";
import type { Goal, Milestone, Task } from "@/lib/types";

type GoalDetailProps = {
  goalId: string;
};

type GoalResponse = {
  goal?: Goal;
  error?: string;
  message?: string;
  source?: "mock" | "deepseek" | "fallback";
  fallbackReason?: string;
};

type ScheduleGenerateResponse = {
  error?: string;
  message?: string;
};

export function GoalDetail({ goalId }: GoalDetailProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    requestJson<GoalResponse>(`/api/goals/${goalId}`)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setGoal(data.goal ?? null);
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
  }, [goalId]);

  if (isLoading) {
    return <StatusPage text={loadingStateText} />;
  }

  if (error || !goal) {
    return <StatusPage tone="error" text={error || "没有找到这个 Boss 目标。"} />;
  }

  const milestones = goal.milestones ?? [];
  const tasks = goal.tasks ?? [];
  const hasCampaign = milestones.length > 0 || tasks.length > 0;
  const hasSchedule = tasks.some((task) => task.status === "scheduled");
  const stats = calculateCampaignStats(milestones, tasks);

  async function generateCampaign() {
    if (!goal) {
      return;
    }

    setIsGenerating(true);
    setError("");
    setMessage("");

    try {
      const data = await requestJson<GoalResponse>(`/api/goals/${goal.id}/decompose`, {
        method: "POST"
      });

      if (data.goal) {
        setGoal(data.goal);
      }

      setMessage(getCampaignMessage(data));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成战役失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateSchedule() {
    if (!goal) {
      return;
    }

    setIsScheduling(true);
    setError("");
    setMessage("");

    try {
      await requestJson<ScheduleGenerateResponse>("/api/schedule/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ goalId: goal.id })
      });

      const refreshed = await requestJson<GoalResponse>(`/api/goals/${goal.id}`);

      if (refreshed.goal) {
        setGoal(refreshed.goal);
      }

      setMessage("恐龙侠已安排好本周战斗路线！");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成失败，请稍后重试。");
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">{goal.bossName}</h1>
          <p className="text-sm text-muted-foreground">目标：{goal.title}</p>
        </div>
        <Button asChild className="shrink-0" variant="secondary">
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
        </Button>
      </section>

      {message ? (
        <Card>
          <CardContent className="p-4 text-sm font-medium text-primary">{message}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm font-medium text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{goal.bossName}</CardTitle>
              <p className="text-sm text-muted-foreground">{goal.bossDescription}</p>
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
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <InfoTile icon={<CalendarClock className="h-4 w-4 text-primary" />} text={goal.deadline} />
            <InfoTile icon={<Clock className="h-4 w-4 text-primary" />} text={formatRemainingDays(goal.deadline)} />
            <InfoTile icon={<Shield className="h-4 w-4 text-primary" />} text={`难度 ${goal.difficulty} 星`} />
            <InfoTile icon={<Swords className="h-4 w-4 text-primary" />} text={intensityLabels[goal.intensity]} />
          </div>
          <Button className="w-full" disabled={isGenerating || isScheduling} onClick={generateCampaign} type="button">
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "正在生成战役..." : hasCampaign ? "重新生成战役" : "生成战役"}
          </Button>
          {hasCampaign ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full"
                disabled={isGenerating || isScheduling}
                onClick={generateSchedule}
                type="button"
              >
                <Route className="h-4 w-4" />
                {isScheduling ? "恐龙侠正在规划战斗路线..." : hasSchedule ? "重新生成本周副本" : "生成本周副本"}
              </Button>
              <Button asChild className="w-full" variant="secondary">
                <Link href="/schedule">查看本周战斗路线</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasCampaign ? <CampaignStats stats={stats} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>目标详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailRow label="目标类型" value={goalTypeLabels[goal.goalType]} />
          <DetailRow label="当前水平" value={goal.currentLevel} />
          <DetailRow label="每天最多学习时间" value={`${goal.dailyAvailableMinutes} 分钟`} />
          <DetailRow label="目标描述" value={goal.description || "未填写"} />
        </CardContent>
      </Card>

      {hasCampaign ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">阶段关卡</h2>
            <p className="text-sm text-muted-foreground">每个关卡下的小怪任务会在下一阶段进入自动排程。</p>
          </div>
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              tasks={tasks.filter((task) => task.milestoneId === milestone.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function getCampaignMessage(data: GoalResponse): string {
  if (data.source === "deepseek") {
    return "DeepSeek 已为你生成 Boss 战役。";
  }

  if (data.source === "fallback") {
    return "AI 暂时不可用，恐龙侠已使用本地模板生成战役。";
  }

  if (data.source === "mock") {
    return "恐龙侠已使用本地模板生成战役。";
  }

  return data.message ?? "恐龙侠已拆解 Boss 战役！";
}

function CampaignStats({ stats }: { stats: ReturnType<typeof calculateCampaignStats> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>战役统计</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <InfoTile icon={<Swords className="h-4 w-4 text-primary" />} text={`${stats.taskCount} 个任务`} />
        <InfoTile icon={<Clock className="h-4 w-4 text-primary" />} text={`${stats.totalMinutes} 分钟`} />
        <InfoTile icon={<Sparkles className="h-4 w-4 text-primary" />} text={`${stats.totalXp} XP`} />
        <InfoTile icon={<Shield className="h-4 w-4 text-primary" />} text={`${stats.milestoneCount} 个阶段`} />
      </CardContent>
    </Card>
  );
}

function MilestoneCard({ milestone, tasks }: { milestone: Milestone; tasks: Task[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>
              第 {milestone.order} 关：{milestone.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
          </div>
          <Badge variant={milestone.status === "active" ? "default" : "secondary"}>
            {milestone.status === "active" ? "进行中" : milestone.status === "completed" ? "已完成" : "待挑战"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">关卡截止：{milestone.dueDate}</p>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{task.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
        </div>
        <Badge variant={task.taskType === "boss_battle" ? "warning" : "secondary"}>
          {taskTypeLabels[task.taskType]}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-5">
        <span>预计 {task.estimatedMinutes} 分钟</span>
        <span>难度 {task.difficulty}</span>
        <span>优先级 {task.priority}</span>
        <span>{task.xpReward} XP</span>
        <span>截止 {task.deadline}</span>
      </div>
    </article>
  );
}

function InfoTile({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function calculateCampaignStats(milestones: Milestone[], tasks: Task[]) {
  return {
    milestoneCount: milestones.length,
    taskCount: tasks.length,
    totalMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    totalXp: tasks.reduce((sum, task) => sum + task.xpReward, 0)
  };
}

function StatusPage({ text, tone = "default" }: { text: string; tone?: "default" | "error" }) {
  return (
    <div className="space-y-5">
      <Button asChild variant="secondary">
        <Link href="/goals">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>
      </Button>
      <Card>
        <CardContent
          className={`p-4 text-sm font-medium ${
            tone === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {text}
        </CardContent>
      </Card>
    </div>
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
