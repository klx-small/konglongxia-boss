import { Activity, AlertTriangle, Download, HeartPulse, MessageSquare, Route } from "lucide-react";
import type { ReactNode } from "react";

import { InternalNav } from "@/components/internal/InternalNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { buildInternalAnalytics } from "@/lib/internal/analytics";

type InternalAnalyticsData = Awaited<ReturnType<typeof buildInternalAnalytics>>;

export function InternalAnalyticsDashboard({ data }: { data: InternalAnalyticsData }) {
  const maxDailyCount = Math.max(1, ...data.eventsByDay.map((day) => day.count));

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <InternalNav />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">内测观察面板</h1>
          <p className="text-sm text-muted-foreground">
            观察课表到今日副本的转化、AI 稳定性、补救机制和反馈信号。
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto" variant="secondary">
          <a download href="/api/internal/feedback/export">
            <Download className="h-4 w-4" />
            导出反馈 CSV
          </a>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Activity className="h-4 w-4" />} label="近 7 日事件数" value={sumEvents(data)} />
        <MetricCard icon={<Route className="h-4 w-4" />} label="创建 Boss 数" value={data.funnel.goalCreated} />
        <MetricCard icon={<HeartPulse className="h-4 w-4" />} label="完成任务数" value={data.battle.taskCompleted} />
        <MetricCard icon={<MessageSquare className="h-4 w-4" />} label="反馈数" value={data.feedbackCount} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>今日对比昨日</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <CompareTile
            delta={data.dailyComparison.eventDelta}
            label="今日事件 vs 昨日"
            today={data.dailyComparison.todayEventCount}
            yesterday={data.dailyComparison.yesterdayEventCount}
          />
          <CompareTile
            delta={data.dailyComparison.completedTaskDelta}
            label="今日完成任务 vs 昨日"
            today={data.dailyComparison.todayCompletedTasks}
            yesterday={data.dailyComparison.yesterdayCompletedTasks}
          />
          <CompareTile
            delta={data.dailyComparison.feedbackDelta}
            label="今日反馈 vs 昨日"
            today={data.dailyComparison.todayFeedbackCount}
            yesterday={data.dailyComparison.yesterdayFeedbackCount}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>内测异常提醒</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.anomalies.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂时没有明显异常，继续观察第一批同学的真实使用。</p>
          ) : (
            data.anomalies.map((item) => (
              <article className="rounded-lg border bg-background p-3 text-sm" key={item.type}>
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className={severityClassName(item.severity)} />
                  <span className="font-semibold">{item.title}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{item.severity}</span>
                  <span className="text-muted-foreground">{item.type}</span>
                </div>
                <p className="mt-2 leading-6 text-muted-foreground">{item.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">触发次数：{item.count}</p>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding 漏斗</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <MetricTile label="课表" value={data.funnel.courseCreated} />
          <MetricTile label="Boss" value={data.funnel.goalCreated} />
          <MetricTile label="战役" value={data.funnel.battlePlanGenerated} />
          <MetricTile label="本周副本" value={data.funnel.scheduleGenerated} />
          <MetricTile label="今日副本" value={data.funnel.todayBattleViewed} />
          <MetricTile label="完成任务" value={data.funnel.taskCompleted} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户漏斗表</CardTitle>
        </CardHeader>
        <CardContent>
          {data.userStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有用户事件。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">用户 ID</th>
                    <th className="py-2 pr-3">事件数</th>
                    <th className="py-2 pr-3">课表</th>
                    <th className="py-2 pr-3">Boss</th>
                    <th className="py-2 pr-3">战役</th>
                    <th className="py-2 pr-3">本周副本</th>
                    <th className="py-2 pr-3">今日副本</th>
                    <th className="py-2 pr-3">完成任务</th>
                    <th className="py-2 pr-3">反馈</th>
                    <th className="py-2 pr-3">最近活跃时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.userStats.map((user) => (
                    <tr className="border-t" key={user.userId}>
                      <td className="max-w-[120px] truncate py-2 pr-3 font-medium">{truncateUserId(user.userId)}</td>
                      <td className="py-2 pr-3">{user.eventCount}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasCourse)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasGoal)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasBattlePlan)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasSchedule)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasViewedTodayBattle)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasCompletedTask)}</td>
                      <td className="py-2 pr-3">{doneMark(user.hasSubmittedFeedback)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{user.lastActiveAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 稳定性</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile label="mock 数" value={data.ai.mock} />
          <MetricTile label="DeepSeek 数" value={data.ai.deepseek} />
          <MetricTile label="fallback 数" value={data.ai.fallback} />
          <MetricTile label="DeepSeek 失败数" value={data.ai.deepseekFailed} />
          <MetricTile label="fallback 率" value={`${data.ai.fallbackRate}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>补救机制使用情况</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile label="完成任务" value={data.battle.taskCompleted} />
          <MetricTile label="missed 数" value={data.battle.taskMissed} />
          <MetricTile label="Boss 回血数" value={data.battle.bossHealed} />
          <MetricTile label="补救副本数" value={data.battle.rescueGenerated} />
          <MetricTile label="补救使用率" value={`${data.battle.rescueUsageRate}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>每日事件趋势</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.eventsByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">近 7 日还没有事件。</p>
          ) : (
            data.eventsByDay.map((day) => (
              <div className="space-y-1" key={day.date}>
                <div className="flex items-center justify-between text-sm">
                  <span>{day.date}</span>
                  <span className="font-semibold">{day.count}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max(6, (day.count / maxDailyCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近反馈</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentFeedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有内测反馈。</p>
            ) : (
              data.recentFeedback.map((feedback) => (
                <article className="rounded-lg border bg-background p-3 text-sm" key={feedback.id}>
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <span>{feedback.type}</span>
                    <span>评分：{feedback.rating ?? "未评分"}</span>
                    <span>{feedback.contactFilled ? "已留联系方式" : "未留联系方式"}</span>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">{feedback.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {feedback.page || "未填写页面"} · {feedback.createdAt}
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近事件流</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有事件流。</p>
            ) : (
              data.recentEvents.slice(0, 12).map((event) => (
                <div className="rounded-lg border bg-background p-3 text-sm" key={event.id}>
                  <p className="font-semibold">{event.eventName}</p>
                  <p className="mt-1 text-muted-foreground">
                    {event.entityType || "未分类"} · {event.createdAt}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>高频事件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无高频事件。</p>
          ) : (
            data.topEvents.map((event) => (
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm" key={event.eventName}>
                <span className="font-medium">{event.eventName}</span>
                <span>{event.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-secondary p-2 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-secondary p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function CompareTile({
  label,
  today,
  yesterday,
  delta
}: {
  label: string;
  today: number;
  yesterday: number;
  delta: number;
}) {
  return (
    <div className="rounded-lg bg-secondary p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="mt-2 text-2xl font-bold">{today}</p>
      <p className="text-muted-foreground">昨日：{yesterday}</p>
      <p className={delta >= 0 ? "text-primary" : "text-destructive"}>
        变化：{delta >= 0 ? "+" : ""}
        {delta}
      </p>
    </div>
  );
}

function sumEvents(data: InternalAnalyticsData): number {
  return data.eventsByDay.reduce((sum, day) => sum + day.count, 0);
}

function doneMark(value: boolean): string {
  return value ? "✅" : "—";
}

function truncateUserId(userId: string): string {
  return userId.length > 14 ? `${userId.slice(0, 8)}...${userId.slice(-4)}` : userId;
}

function severityClassName(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "h-4 w-4 text-destructive";
  }

  if (severity === "medium") {
    return "h-4 w-4 text-primary";
  }

  return "h-4 w-4 text-muted-foreground";
}
