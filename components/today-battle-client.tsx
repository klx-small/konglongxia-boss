"use client";

import { useEffect, useState } from "react";

import { BossCard } from "@/components/boss-card";
import { TodayDungeon } from "@/components/today-dungeon";
import { XpBar } from "@/components/xp-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayBattleData } from "@/lib/battle/today-types";
import { emptyStateText, errorStateText, loadingStateText } from "@/lib/ui/status-text";

type RescheduleResponse = {
  message?: string;
  rescueBlocks?: unknown[];
  movedBlocks?: unknown[];
  unchangedBlocks?: unknown[];
  unscheduledTasks?: unknown[];
};

type RescheduleImpact = {
  rescueCount: number;
  movedCount: number;
  unchangedCount: number;
  unscheduledCount: number;
};

export function TodayBattleClient() {
  const [data, setData] = useState<TodayBattleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestId, setActiveQuestId] = useState("");
  const [activeRescueTaskId, setActiveRescueTaskId] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleImpact, setRescheduleImpact] = useState<RescheduleImpact | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    requestJson<TodayBattleData>("/api/battle/today")
      .then((nextData) => {
        if (!isMounted) {
          return;
        }

        setData(nextData);
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

  async function completeQuest(questId: string) {
    setActiveQuestId(questId);
    setError("");
    setMessage("");
    setRescheduleImpact(null);

    try {
      const nextData = await requestJson<TodayBattleData>(`/api/battle/today/${questId}/complete`, {
        method: "POST"
      });

      setData(nextData);
      setMessage("恐龙侠已完成攻击，Boss 掉血了！");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "完成副本失败，请稍后重试。");
    } finally {
      setActiveQuestId("");
    }
  }

  async function rescheduleMissedQuests() {
    setIsRescheduling(true);
    setError("");
    setMessage("");
    setRescheduleImpact(null);

    try {
      const response = await requestJson<RescheduleResponse>("/api/schedule/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" })
      });
      const nextData = await requestJson<TodayBattleData>("/api/battle/today");

      setData(nextData);
      setMessage(response.message ?? "恐龙侠已重新规划战线，补救副本已生成。");
      setRescheduleImpact(toRescheduleImpact(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成补救副本失败，请稍后重试。");
    } finally {
      setIsRescheduling(false);
    }
  }

  async function rescheduleSingleQuest(taskId: string) {
    setActiveRescueTaskId(taskId);
    setError("");
    setMessage("");
    setRescheduleImpact(null);

    try {
      const response = await requestJson<RescheduleResponse>("/api/schedule/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tasks", taskIds: [taskId] })
      });
      const nextData = await requestJson<TodayBattleData>("/api/battle/today");

      setData(nextData);
      setMessage(response.message ?? "恐龙侠已为这个小怪安排补救副本。");
      setRescheduleImpact(toRescheduleImpact(response));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成补救副本失败，请稍后重试。");
    } finally {
      setActiveRescueTaskId("");
    }
  }

  const hasMissedQuests =
    data?.hasMissedQuests ?? data?.quests.some((quest) => quest.status === "missed") ?? false;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold leading-tight">今日副本</h1>
        <p className="text-sm text-muted-foreground">
          完成副本后，恐龙侠会攻击 Boss 并获得 XP。
        </p>
      </section>

      {isLoading ? <StatusCard text={loadingStateText} /> : null}
      {!isLoading && error ? <StatusCard tone="error" text={error} /> : null}
      {message ? <StatusCard tone="success" text={message} /> : null}
      {rescheduleImpact ? <RescheduleImpactCard impact={rescheduleImpact} /> : null}

      {data ? (
        <>
          {hasMissedQuests ? (
            <MissedQuestBanner isLoading={isRescheduling} onReschedule={rescheduleMissedQuests} />
          ) : null}

          <XpBar progress={data.progress} />

          <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <TodayDungeon
              heading="副本清单"
              isCompletingQuestId={activeQuestId}
              isReschedulingQuestId={activeRescueTaskId}
              onCompleteQuest={completeQuest}
              onRescueQuest={rescheduleSingleQuest}
              quests={data.quests}
            />
            {data.bossGoal ? (
              <BossCard goal={data.bossGoal} />
            ) : (
              <StatusCard text={emptyStateText} />
            )}
          </section>

          <SettlementCard data={data} />
        </>
      ) : null}
    </div>
  );
}

function SettlementCard({ data }: { data: TodayBattleData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>今日战斗结算</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="leading-6 text-muted-foreground">{data.settlement.summary}</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <SettlementTile label="完成副本" value={`${data.settlement.completedQuestCount} 个`} />
          <SettlementTile label="造成伤害" value={`${data.settlement.totalDamage}`} />
          <SettlementTile label="获得 XP" value={`${data.settlement.totalXp}`} />
          <SettlementTile label="错过副本" value={`${data.settlement.missedQuestCount} 个`} />
          <SettlementTile label="Boss 回血" value={`${data.settlement.bossHpRecovered}`} />
          <SettlementTile label="补救副本" value={`${data.settlement.rescueQuestCount ?? 0} 个`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MissedQuestBanner({
  isLoading,
  onReschedule
}: {
  isLoading: boolean;
  onReschedule: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium text-primary">
          有任务错过了，恐龙侠可以帮你生成补救副本。
        </p>
        <button
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          disabled={isLoading}
          onClick={onReschedule}
          type="button"
        >
          {isLoading ? "正在重新规划..." : "生成补救副本"}
        </button>
      </CardContent>
    </Card>
  );
}

function RescheduleImpactCard({ impact }: { impact: RescheduleImpact }) {
  const messages = formatImpactMessages(impact);

  return (
    <Card>
      <CardContent className="space-y-2 p-4 text-sm">
        {messages.map((item) => (
          <p className="font-medium text-primary" key={item}>
            {item}
          </p>
        ))}
        <div className="grid grid-cols-2 gap-2 pt-1 md:grid-cols-4">
          <SettlementTile label="新增补救" value={`${impact.rescueCount} 个`} />
          <SettlementTile label="移动任务" value={`${impact.movedCount} 个`} />
          <SettlementTile label="未受影响" value={`${impact.unchangedCount} 个`} />
          <SettlementTile label="未排入" value={`${impact.unscheduledCount} 个`} />
        </div>
      </CardContent>
    </Card>
  );
}

function SettlementTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StatusCard({
  text,
  tone = "default"
}: {
  text: string;
  tone?: "default" | "error" | "success";
}) {
  const textClass =
    tone === "error" ? "text-destructive" : tone === "success" ? "text-primary" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className={`p-4 text-sm font-medium ${textClass}`}>{text}</CardContent>
    </Card>
  );
}

function toRescheduleImpact(response: RescheduleResponse): RescheduleImpact {
  return {
    rescueCount: response.rescueBlocks?.length ?? 0,
    movedCount: response.movedBlocks?.length ?? 0,
    unchangedCount: response.unchangedBlocks?.length ?? 0,
    unscheduledCount: response.unscheduledTasks?.length ?? 0
  };
}

function formatImpactMessages(impact: RescheduleImpact): string[] {
  const messages = [];

  if (impact.movedCount === 0) {
    messages.push(`本次补救新增 ${impact.rescueCount} 个副本，未打乱其他任务。`);
  } else {
    messages.push(`本次补救移动了 ${impact.movedCount} 个未来任务，已尽量保持原计划稳定。`);
  }

  if (impact.unscheduledCount > 0) {
    messages.push(`有 ${impact.unscheduledCount} 个任务暂时没有找到合适时间，建议增加可学习时间。`);
  }

  return messages;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "请求失败，请稍后重试。");
  }

  return data;
}
