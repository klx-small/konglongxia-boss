"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Swords } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWeekdayLabel } from "@/lib/courses/course-format";
import { taskTypeLabels } from "@/lib/goals/goal-format";
import { emptyStateText, errorStateText, loadingStateText } from "@/lib/ui/status-text";
import type { Course, ScheduleBlock, Task } from "@/lib/types";

type ScheduleResponse = {
  scheduleBlocks?: ScheduleBlock[];
  courses?: Course[];
  unscheduledTasks?: Task[];
  error?: string;
};

export function ScheduleBoard() {
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/api/schedule")
      .then(async (response) => {
        const data = (await response.json()) as ScheduleResponse;

        if (!response.ok) {
          throw new Error(data.error ?? errorStateText);
        }

        return data;
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setScheduleBlocks(data.scheduleBlocks ?? []);
        setCourses(data.courses ?? []);
        setUnscheduledTasks(data.unscheduledTasks ?? []);
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
        <h1 className="text-3xl font-bold leading-tight">本周战斗路线</h1>
        <p className="text-sm text-muted-foreground">
          恐龙侠已根据你的课表，把 Boss 小怪安排进空闲时间。
        </p>
      </section>

      {isLoading ? <StatusCard text={loadingStateText} /> : null}
      {!isLoading && error ? <StatusCard tone="error" text={error} /> : null}
      {!isLoading && !error && scheduleBlocks.length === 0 ? (
        <StatusCard text={emptyStateText} />
      ) : null}

      {!isLoading && !error && scheduleBlocks.length > 0 ? (
        <section className="space-y-3">
          {nextSevenDays().map((date) => (
            <DayPlan
              courses={courses.filter((course) => course.weekday === getWeekdayNumber(date))}
              date={date}
              key={date}
              scheduleBlocks={scheduleBlocks.filter((block) => block.startTime.slice(0, 10) === date)}
            />
          ))}
        </section>
      ) : null}

      {!isLoading && !error && unscheduledTasks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>未排入任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              有些任务暂时没有找到合适时间，恐龙侠建议你减少任务量或增加可学习时间。
            </p>
            {unscheduledTasks.map((task) => (
              <p className="text-sm" key={task.id}>
                {task.title}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DayPlan({
  date,
  courses,
  scheduleBlocks
}: {
  date: string;
  courses: Course[];
  scheduleBlocks: ScheduleBlock[];
}) {
  const items = [
    ...courses.map((course) => ({
      id: course.id,
      time: course.startTime,
      sortTime: `${date}T${course.startTime}:00.000Z`,
      content: <CourseItem course={course} />
    })),
    ...scheduleBlocks.map((block) => ({
      id: block.id,
      time: formatTimeRange(block.startTime, block.endTime),
      sortTime: block.startTime,
      content: <ScheduleItem block={block} />
    }))
  ].sort((a, b) => a.sortTime.localeCompare(b.sortTime));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {getWeekdayLabel(getWeekdayNumber(date))} · {date}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">今天暂无课程和副本。</p>
        ) : (
          items.map((item) => <div key={item.id}>{item.content}</div>)
        )}
      </CardContent>
    </Card>
  );
}

function CourseItem({ course }: { course: Course }) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{course.startTime} - {course.endTime}</p>
          <h3 className="break-words font-semibold">{course.name}</h3>
          <p className="text-sm text-muted-foreground">{course.location || "未填写教室"}</p>
        </div>
        <Badge className="w-fit" variant="secondary">
          <CalendarDays className="mr-1 h-3 w-3" />
          固定课程
        </Badge>
      </div>
    </article>
  );
}

function ScheduleItem({ block }: { block: ScheduleBlock }) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{formatTimeRange(block.startTime, block.endTime)}</p>
          <h3 className="break-words font-semibold">{block.taskTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {block.bossName} · {block.xpReward ?? 0} XP
          </p>
        </div>
        <Badge className="w-fit" variant={block.taskType === "boss_battle" ? "warning" : "secondary"}>
          <Swords className="mr-1 h-3 w-3" />
          {block.taskType ? taskTypeLabels[block.taskType] : "学习任务"}
        </Badge>
      </div>
    </article>
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

function nextSevenDays(): string[] {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function getWeekdayNumber(date: string): number {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(11, 16)} - ${endTime.slice(11, 16)}`;
}
