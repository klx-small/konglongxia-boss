import Link from "next/link";

import { InternalNav } from "@/components/internal/InternalNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const testerTasks = [
  "打开首页，体验“一键体验恐龙侠”",
  "查看今日副本",
  "完成一个任务",
  "故意错过一个任务，测试补救副本",
  "创建一个自己的 Boss",
  "生成战役",
  "生成本周副本",
  "提交一条反馈"
];

const testerQuestions = [
  "哪一步最难理解？",
  "任务安排是否合理？",
  "Boss 血条有没有激励感？",
  "补救副本有没有用？",
  "你愿意明天再打开吗？",
  "你最想删掉或增加什么功能？"
];

const preflightTasks = [
  "确认 /internal/readiness 全部没有失败项",
  "确认 /api/health 数据库状态正常",
  "确认 /internal/analytics 可以看到事件和反馈",
  "准备 5-10 位中文大学生内测同学",
  "告诉同学本轮体验控制在 15-20 分钟"
];

export function InternalTestPlan() {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <InternalNav />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">第一轮内测任务清单</h1>
          <p className="text-sm text-muted-foreground">
            给第一批同学一条清晰路线，帮助你观察他们是否能从首页一路走到今日副本和反馈闭环。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild className="w-full">
            <Link href="/">去一键体验</Link>
          </Button>
          <Button asChild className="w-full" variant="secondary">
            <Link href="/battle/today">去今日副本</Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/feedback">去反馈</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>内测前准备</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {preflightTasks.map((task) => (
            <div className="rounded-lg bg-secondary p-3" key={task}>
              {task}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>给内测同学的任务</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {testerTasks.map((task, index) => (
              <li className="rounded-lg bg-secondary p-3" key={task}>
                {index + 1}. {task}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>给测试者的问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {testerQuestions.map((question) => (
            <div className="rounded-lg bg-secondary p-3" key={question}>
              {question}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
