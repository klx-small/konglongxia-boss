"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayBattleData } from "@/lib/battle/today-types";
import { errorStateText, loadingStateText } from "@/lib/ui/status-text";

export function BattleSummaryClient() {
  const [data, setData] = useState<TodayBattleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/battle/today")
      .then(async (response) => {
        const nextData = (await response.json()) as TodayBattleData & { error?: string };

        if (!response.ok) {
          throw new Error(nextData.error ?? errorStateText);
        }

        return nextData;
      })
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

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold leading-tight">战斗结算</h1>
        <p className="text-sm text-muted-foreground">
          今天不算完美，但恐龙侠已经帮你重新规划战线。
        </p>
      </section>

      {isLoading ? <StatusCard text={loadingStateText} /> : null}
      {!isLoading && error ? <StatusCard tone="error" text={error} /> : null}
      {data ? <SummaryContent data={data} /> : null}
    </div>
  );
}

function SummaryContent({ data }: { data: TodayBattleData }) {
  const rescueQuests = data.rescueQuests ?? [];
  const missedQuests = data.missedQuests ?? data.quests.filter((quest) => quest.status === "missed");
  const firstRescueQuest = rescueQuests[0];
  const rescueQuestCount = data.settlement.rescueQuestCount ?? rescueQuests.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>今日结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{data.settlement.summary}</p>
          {data.settlement.missedQuestCount > 0 ? (
            <p className="text-sm font-medium text-primary">
              错过 {data.settlement.missedQuestCount} 个小怪，Boss 回血 {data.settlement.bossHpRecovered} 点。
            </p>
          ) : null}
          {firstRescueQuest ? (
            <p className="text-sm font-medium text-primary">
              补救副本已安排到明天 {firstRescueQuest.scheduledTimeLabel.split(" - ")[0]}。
            </p>
          ) : null}
          {rescueQuestCount > 0 ? (
            <>
              <p className="text-sm font-medium text-primary">
                恐龙侠今天帮你补救了 {rescueQuestCount} 个小怪。
              </p>
              <p className="text-sm font-medium text-primary">
                计划没有崩，只是战线重新调整了一下。
              </p>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryTile label="今日任务" value={`${data.settlement.totalQuestCount ?? data.quests.length} 个`} />
            <SummaryTile label="已完成" value={`${data.settlement.completedQuestCount} 个`} />
            <SummaryTile label="错过" value={`${data.settlement.missedQuestCount} 个`} />
            <SummaryTile label="获得 XP" value={`${data.settlement.totalXp}`} />
            <SummaryTile label="Boss 掉血" value={`${data.settlement.totalDamage}`} />
            <SummaryTile label="Boss 回血" value={`${data.settlement.bossHpRecovered}`} />
            <SummaryTile label="连击状态" value={`连续 ${data.progress.streakDays} 天`} />
            <SummaryTile label="明日预计" value={`${data.settlement.tomorrowStudyMinutes ?? 0} 分钟`} />
            <SummaryTile label="新增补救" value={`${rescueQuestCount} 个`} />
            <SummaryTile label="被移动任务" value={`${data.settlement.movedBlockCount ?? 0} 个`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>错过的小怪</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {missedQuests.length === 0 ? (
            <p className="text-sm text-muted-foreground">今天没有错过的小怪。</p>
          ) : (
            missedQuests.map((quest) => (
              <div className="rounded-lg border bg-background p-3" key={quest.id}>
                <p className="font-semibold">{quest.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quest.scheduledTimeLabel} · {quest.estimatedMinutes} 分钟 · Boss 回血已记录
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>补救副本</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rescueQuests.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂时没有补救副本。</p>
          ) : (
            rescueQuests.map((quest) => (
              <div className="rounded-lg border bg-background p-3" key={quest.id}>
                <p className="font-semibold">{quest.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quest.scheduledTimeLabel} · {quest.estimatedMinutes} 分钟 · {quest.xpReward} XP
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button asChild className="w-full" variant="secondary">
        <Link href="/battle/today">返回今日副本</Link>
      </Button>
    </>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
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
