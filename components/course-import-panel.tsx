"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCourseCsv, type ParsedCourseInput } from "@/lib/courses/course-csv";
import { formatCourseTime, getWeekTypeLabel, getWeekdayLabel } from "@/lib/courses/course-format";

const sampleCsv = `课程名,星期,开始时间,结束时间,开始周,结束周,单双周,教室,老师
高等数学,周一,08:00,09:40,1,16,每周,A101,王老师
大学英语,周三,10:10,11:50,1,16,单周,B203,李老师
计算机基础,周五,14:00,15:40,1,12,双周,C305,张老师`;

type ImportResponse = {
  errors?: string[];
};

export function CourseImportPanel() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const preview = useMemo(() => parseCourseCsv(csvText), [csvText]);

  async function confirmImport() {
    setSavedMessage("");
    setServerErrors([]);
    setIsImporting(true);

    try {
      const response = await fetch("/api/courses/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText })
      });
      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        setServerErrors(data.errors?.length ? data.errors : ["导入失败，请稍后重试。"]);
        return;
      }

      setSavedMessage("导入成功");
      setHasPreviewed(false);
    } catch {
      setServerErrors(["导入失败，请稍后重试。"]);
    } finally {
      setIsImporting(false);
    }
  }

  const visibleErrors = [...preview.errors, ...serverErrors];

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">导入课表</h1>
          <p className="text-sm text-muted-foreground">
            粘贴 CSV 后先预览，确认无误再保存到课表。
          </p>
        </div>
        <Button asChild className="shrink-0" variant="secondary">
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
        </Button>
      </section>

      {savedMessage ? (
        <Card>
          <CardContent className="p-4 text-sm font-medium text-primary">{savedMessage}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>CSV 文本</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-56 w-full rounded-lg border bg-background p-3 text-sm leading-6"
            onChange={(event) => {
              setCsvText(event.target.value);
              setHasPreviewed(false);
              setSavedMessage("");
              setServerErrors([]);
            }}
            value={csvText}
          />
          <Button
            onClick={() => {
              setHasPreviewed(true);
              setSavedMessage("");
              setServerErrors([]);
            }}
            type="button"
          >
            <ClipboardList className="h-4 w-4" />
            预览导入
          </Button>
        </CardContent>
      </Card>

      {hasPreviewed ? (
        <Card>
          <CardHeader>
            <CardTitle>导入确认</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleErrors.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {visibleErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {preview.courses.map((course, index) => (
                    <PreviewCourseItem course={course} key={`${course.name}-${index}`} />
                  ))}
                </div>
                <Button disabled={isImporting} onClick={confirmImport} type="button">
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  确认保存
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewCourseItem({ course }: { course: ParsedCourseInput }) {
  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{course.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getWeekdayLabel(course.weekday)} {formatCourseTime(course)} · 第 {course.startWeek}-
            {course.endWeek} 周 · {getWeekTypeLabel(course.weekType)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.location || "未填写教室"} · {course.teacher || "未填写老师"}
          </p>
        </div>
      </div>
    </article>
  );
}

