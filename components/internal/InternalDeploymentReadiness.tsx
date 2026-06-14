import { AlertTriangle, CheckCircle2, CircleAlert, Rocket } from "lucide-react";

import { InternalNav } from "@/components/internal/InternalNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { buildDeploymentReadiness, DeploymentCheckStatus } from "@/lib/internal/deployment-readiness";

type DeploymentReadinessData = Awaited<ReturnType<typeof buildDeploymentReadiness>>;

export function InternalDeploymentReadiness({ data }: { data: DeploymentReadinessData }) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <InternalNav />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">真实内测部署检查</h1>
          <p className="text-sm text-muted-foreground">
            上线给第一批同学前，先确认数据库、AI、反馈、埋点和内部工具开关都处在可控状态。
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>检查结论</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-4">
          <StatusTile label="通过" value={data.summary.passCount} />
          <StatusTile label="提醒" value={data.summary.warnCount} />
          <StatusTile label="失败" value={data.summary.failCount} />
          <StatusTile label="是否可内测" value={data.summary.readyForPilot ? "可以" : "先修复失败项"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>环境状态</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <StatusTile label="版本" value={data.version} />
          <StatusTile label="NODE_ENV" value={data.environment.nodeEnv} />
          <StatusTile label="AI_PROVIDER" value={data.environment.aiProvider} />
          <StatusTile label="DATABASE_URL" value={data.environment.databaseUrlStatus} />
          <StatusTile label="DeepSeek Key" value={data.environment.deepSeekKeyStatus} />
          <StatusTile label="DeepSeek 开关" value={data.environment.deepSeekEnabled ? "已开启" : "已关闭"} />
          <StatusTile label="Analytics" value={data.environment.analyticsEnabled ? "已开启" : "已关闭"} />
          <StatusTile label="反馈系统" value={data.environment.feedbackEnabled ? "已开启" : "已关闭"} />
          <StatusTile label="反馈链接" value={data.environment.feedbackUrlStatus} />
          <StatusTile label="内部工具" value={data.environment.internalToolsEnabled ? "已开启" : "默认关闭"} />
          <StatusTile label="一键 Demo" value={data.environment.demoSetupEnabled ? "已开启" : "默认关闭"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>部署检查项</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.checks.map((check) => {
            const Icon = statusIcon(check.status);

            return (
              <article className="rounded-lg border bg-background p-3 text-sm" key={check.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className={statusClassName(check.status)} />
                  <span className="font-semibold">{check.title}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{statusLabel(check.status)}</span>
                </div>
                <p className="mt-2 leading-6 text-muted-foreground">{check.description}</p>
                <p className="mt-2 font-medium">{check.action}</p>
              </article>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>首轮内测准备包</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.pilotPack.map((item) => (
            <div className="flex gap-2 rounded-lg bg-secondary p-3" key={item}>
              <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-secondary p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-xl font-bold">{value}</p>
    </div>
  );
}

function statusIcon(status: DeploymentCheckStatus) {
  if (status === "pass") {
    return CheckCircle2;
  }

  if (status === "warn") {
    return AlertTriangle;
  }

  return CircleAlert;
}

function statusClassName(status: DeploymentCheckStatus): string {
  if (status === "pass") {
    return "h-4 w-4 text-primary";
  }

  if (status === "warn") {
    return "h-4 w-4 text-primary";
  }

  return "h-4 w-4 text-destructive";
}

function statusLabel(status: DeploymentCheckStatus): string {
  if (status === "pass") {
    return "通过";
  }

  if (status === "warn") {
    return "提醒";
  }

  return "失败";
}
