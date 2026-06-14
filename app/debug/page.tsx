import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InternalNav } from "@/components/internal/InternalNav";
import { demoGoalUserId } from "@/lib/goals/goal-api";
import { buildInternalMetrics } from "@/lib/internal/metrics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const debugData = await loadDebugData();

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <InternalNav />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">内测调试面板</h1>
          <p className="text-sm text-muted-foreground">
            这里只在开发环境显示，用来快速检查恐龙侠的数据状态。
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>数据库状态</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <DebugTile label="连接状态" value={debugData.databaseStatus} />
          <DebugTile label="当前用户" value={demoGoalUserId} />
          <DebugTile label="当前版本" value="MVP v0.2" />
          <DebugTile label="AI_PROVIDER" value={debugData.aiProvider} />
          <DebugTile label="DeepSeek Key" value={debugData.deepSeekKeyStatus} />
          <DebugTile label="Boss 目标" value={`${debugData.goalCount} 个`} />
          <DebugTile label="课程" value={`${debugData.courseCount} 门`} />
          <DebugTile label="排程块" value={`${debugData.scheduleBlockCount} 个`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E2E 状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>请运行 npm.cmd run e2e</p>
          <Button asChild className="w-full" variant="secondary">
            <Link href="/internal/analytics">查看内测观察面板</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>内测指标</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <DebugTile label="今日新增事件" value={`${debugData.todayAnalyticsEventCount} 个`} />
          <DebugTile label="总事件数" value={`${debugData.analyticsEventCount} 个`} />
          <DebugTile label="完成任务" value={`${debugData.completedTaskCount} 个`} />
          <DebugTile label="missed 任务" value={`${debugData.missedTaskCount} 个`} />
          <DebugTile label="补救副本" value={`${debugData.rescueBlockCount} 个`} />
          <DebugTile label="AI mock" value={`${debugData.aiSourceStats.mock} 次`} />
          <DebugTile label="AI deepseek" value={`${debugData.aiSourceStats.deepseek} 次`} />
          <DebugTile label="AI fallback" value={`${debugData.aiSourceStats.fallback} 次`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding 漏斗</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          <DebugTile label="课程" value={debugData.onboardingFunnel.hasCourse ? "已完成" : "未完成"} />
          <DebugTile label="Boss" value={debugData.onboardingFunnel.hasGoal ? "已完成" : "未完成"} />
          <DebugTile label="战役" value={debugData.onboardingFunnel.hasBattlePlan ? "已完成" : "未完成"} />
          <DebugTile label="排程" value={debugData.onboardingFunnel.hasSchedule ? "已完成" : "未完成"} />
          <DebugTile label="首个完成" value={debugData.onboardingFunnel.hasCompletedTask ? "已完成" : "未完成"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近战斗日志</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {debugData.battleLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有战斗日志。</p>
          ) : (
            debugData.battleLogs.map((log) => (
              <div className="rounded-lg border bg-background p-3 text-sm" key={log.id}>
                <p className="font-semibold">{log.message}</p>
                <p className="mt-1 text-muted-foreground">
                  {log.actionType} · {log.amount} · {log.createdAt}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {debugData.error ? (
        <Card>
          <CardContent className="p-4 text-sm font-medium text-destructive">
            {debugData.error}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function loadDebugData() {
  const health = await readHealthStatus();

  try {
    const [metrics, battleLogs] = await Promise.all([
      buildInternalMetrics(),
      prisma.battleLog.findMany({
        where: { userId: demoGoalUserId },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    return {
      databaseStatus: health.database === "ok" ? "已连接" : "连接失败",
      aiProvider: process.env.AI_PROVIDER || "mock",
      deepSeekKeyStatus: process.env.DEEPSEEK_API_KEY ? "已配置" : "未配置",
      goalCount: metrics.goalCount,
      courseCount: metrics.courseCount,
      scheduleBlockCount: metrics.scheduleBlockCount,
      completedTaskCount: metrics.completedTaskCount,
      missedTaskCount: metrics.missedTaskCount,
      rescueBlockCount: metrics.rescueBlockCount,
      analyticsEventCount: metrics.analyticsEventCount,
      todayAnalyticsEventCount: metrics.todayAnalyticsEventCount,
      aiSourceStats: metrics.aiSourceStats,
      onboardingFunnel: metrics.onboardingFunnel,
      battleLogs: battleLogs.map((log) => ({
        id: log.id,
        actionType: log.actionType,
        amount: log.amount,
        message: log.message,
        createdAt: log.createdAt.toISOString()
      })),
      error: health.status === "ok" ? "" : health.message
    };
  } catch (error) {
    return {
      databaseStatus: "连接失败",
      aiProvider: process.env.AI_PROVIDER || "mock",
      deepSeekKeyStatus: process.env.DEEPSEEK_API_KEY ? "已配置" : "未配置",
      goalCount: 0,
      courseCount: 0,
      scheduleBlockCount: 0,
      completedTaskCount: 0,
      missedTaskCount: 0,
      rescueBlockCount: 0,
      analyticsEventCount: 0,
      todayAnalyticsEventCount: 0,
      aiSourceStats: { mock: 0, deepseek: 0, fallback: 0 },
      onboardingFunnel: {
        hasCourse: false,
        hasGoal: false,
        hasBattlePlan: false,
        hasSchedule: false,
        hasCompletedTask: false
      },
      battleLogs: [],
      error: error instanceof Error ? error.message : "数据库连接失败。"
    };
  }
}

async function readHealthStatus(): Promise<{
  status: "ok" | "error";
  database: "ok" | "error";
  message: string;
}> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "127.0.0.1:3000";
    const protocol = host.startsWith("127.") || host.startsWith("localhost") ? "http" : "https";
    const response = await fetch(`${protocol}://${host}/api/health`, { cache: "no-store" });
    const data = (await response.json()) as {
      status?: string;
      database?: string;
      message?: string;
    };

    return {
      status: data.status === "ok" ? "ok" : "error",
      database: data.database === "ok" ? "ok" : "error",
      message: data.message ?? ""
    };
  } catch {
    return {
      status: "error",
      database: "error",
      message: "数据库连接失败"
    };
  }
}

function DebugTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-semibold">{value}</p>
    </div>
  );
}
