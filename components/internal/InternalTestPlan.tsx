import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const testerTasks = [
  "点击“一键体验恐龙侠”",
  "查看今日副本",
  "完成一个小怪任务",
  "创建一个自己的 Boss",
  "生成 Boss 战役",
  "生成本周副本",
  "提交一条反馈"
];

const testerQuestions = [
  "哪一步最难理解？",
  "Boss / 小怪 / 今日副本这些说法能不能看懂？",
  "任务安排是否合理？",
  "你愿意第二天再打开吗？"
];

export function InternalTestPlan() {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">恐龙侠内测体验任务</h1>
          <p className="text-sm text-muted-foreground">
            请按顺序体验 15 分钟，最后留一条反馈
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild className="w-full">
            <Link href="/#demo">开始一键体验</Link>
          </Button>
          <Button asChild className="w-full" variant="secondary">
            <Link href="/battle/today">去今日副本</Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/feedback">提交反馈</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>体验任务</CardTitle>
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
          <CardTitle>体验结束后想问你</CardTitle>
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
