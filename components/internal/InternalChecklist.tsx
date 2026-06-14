import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";

import { InternalNav } from "@/components/internal/InternalNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type InternalChecklistData = {
  databaseOk: boolean;
  healthOk: boolean;
  hasCourse: boolean;
  hasGoal: boolean;
  hasBattlePlan: boolean;
  hasSchedule: boolean;
  hasTodayQuest: boolean;
  canSubmitFeedback: boolean;
  hasAnalyticsEvent: boolean;
  aiProvider: string;
  deepSeekKeyStatus: string;
};

const labels: Array<[keyof Omit<InternalChecklistData, "aiProvider" | "deepSeekKeyStatus">, string]> = [
  ["databaseOk", "数据库连接"],
  ["healthOk", "Health API"],
  ["hasCourse", "是否有课程"],
  ["hasGoal", "是否有 Boss"],
  ["hasBattlePlan", "是否有战役"],
  ["hasSchedule", "是否有本周副本"],
  ["hasTodayQuest", "是否有今日副本"],
  ["canSubmitFeedback", "是否能提交反馈"],
  ["hasAnalyticsEvent", "是否有 AnalyticsEvent"]
];

export function InternalChecklist({ data }: { data: InternalChecklistData }) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <InternalNav />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">内测检查清单</h1>
          <p className="text-sm text-muted-foreground">
            内测前快速确认主链路、反馈和埋点是否准备好。
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto" variant="secondary">
          <Link href="/internal/analytics">查看内测观察面板</Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>基础状态</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {labels.map(([key, label]) => (
            <ChecklistItem isOk={Boolean(data[key])} key={key} label={label} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 状态</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-secondary p-3 font-medium">AI_PROVIDER：{data.aiProvider}</div>
          <div className="rounded-lg bg-secondary p-3 font-medium">
            DeepSeek Key：{data.deepSeekKeyStatus}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, isOk }: { label: string; isOk: boolean }) {
  const Icon = isOk ? CheckCircle2 : CircleAlert;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm">
      <Icon className={isOk ? "h-4 w-4 text-primary" : "h-4 w-4 text-destructive"} />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-muted-foreground">{isOk ? "正常" : "待确认"}</span>
    </div>
  );
}
