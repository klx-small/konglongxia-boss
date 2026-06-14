"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, FileUp, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCourseTime,
  formatDuration,
  getWeekTypeLabel,
  getWeekdayLabel,
  toSchedulerCourse,
  weekdayLabels
} from "@/lib/courses/course-format";
import { findFreeSlots } from "@/lib/scheduler/findFreeSlots";
import { emptyStateText, errorStateText, loadingStateText } from "@/lib/ui/status-text";
import type { Course, CourseWeekType } from "@/lib/types";

const emptyForm = {
  name: "",
  teacher: "",
  location: "",
  weekday: 1,
  startTime: "08:00",
  endTime: "09:40",
  startWeek: 1,
  endWeek: 16,
  weekType: "all" as CourseWeekType,
  color: "#13795b"
};

type CourseFormState = typeof emptyForm;

type CourseManagerProps = {
  initialCourses: Course[];
};

type CoursesResponse = {
  courses?: Course[];
  course?: Course;
  error?: string;
};

export function CourseManager({ initialCourses }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [form, setForm] = useState<CourseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadCourses();
  }, []);

  const freeDays = useMemo(
    () =>
      findFreeSlots({
        courses: courses.map(toSchedulerCourse),
        fixedTimeBlocks: [],
        dateRange: { startDate: "2026-06-15", endDate: "2026-06-21" },
        userPreferences: { currentWeek: 1 }
      }),
    [courses]
  );

  async function loadCourses() {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestJson<CoursesResponse>("/api/courses");
      setCourses(data.courses ?? []);
    } catch {
      setError(errorStateText);
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm<Key extends keyof CourseFormState>(key: Key, value: CourseFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function submitCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("请填写课程名。");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("结束时间必须晚于开始时间。");
      return;
    }

    if (form.endWeek < form.startWeek) {
      setError("结束周不能早于开始周。");
      return;
    }

    setIsSaving(true);

    try {
      const url = editingId ? `/api/courses/${editingId}` : "/api/courses";
      const method = editingId ? "PUT" : "POST";
      await requestJson<CoursesResponse>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          teacher: form.teacher.trim(),
          location: form.location.trim()
        })
      });
      resetForm();
      setMessage("保存成功");
      await loadCourses();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  function editCourse(course: Course) {
    setEditingId(course.id);
    setForm({
      name: course.name,
      teacher: course.teacher,
      location: course.location,
      weekday: course.weekday,
      startTime: course.startTime,
      endTime: course.endTime,
      startWeek: course.startWeek,
      endWeek: course.endWeek,
      weekType: course.weekType,
      color: course.color
    });
    setMessage("");
    setError("");
  }

  async function deleteCourse(courseId: string) {
    setMessage("");
    setError("");

    try {
      await requestJson<{ ok: boolean; error?: string }>(`/api/courses/${courseId}`, {
        method: "DELETE"
      });
      setMessage("删除成功");
      await loadCourses();

      if (editingId === courseId) {
        resetForm();
      }
    } catch {
      setError("删除失败，请稍后重试。");
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">课表</h1>
          <p className="text-sm text-muted-foreground">
            课程时间不可移动，副本只能排在空闲时间。
          </p>
        </div>
        <Button asChild className="shrink-0" aria-label="导入课表">
          <Link href="/courses/import">
            <FileUp className="h-4 w-4" />
            导入
          </Link>
        </Button>
      </section>

      {isLoading ? (
        <StatusCard text={loadingStateText} />
      ) : (
        <>
          {error ? <StatusCard tone="error" text={error} /> : null}
          {message ? <StatusCard tone="success" text={message} /> : null}
          <FreeTimeSummary days={freeDays} />
          <WeeklyCourseView courses={courses} />

          <section className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <CourseForm
              editingId={editingId}
              form={form}
              isSaving={isSaving}
              onCancel={resetForm}
              onSubmit={submitCourse}
              updateForm={updateForm}
            />
            <CourseList courses={courses} deleteCourse={deleteCourse} editCourse={editCourse} />
          </section>
        </>
      )}
    </div>
  );
}

function StatusCard({ text, tone = "default" }: { text: string; tone?: "default" | "success" | "error" }) {
  const colorClass =
    tone === "error" ? "text-destructive" : tone === "success" ? "text-primary" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className={`p-4 text-sm font-medium ${colorClass}`}>{text}</CardContent>
    </Card>
  );
}

function FreeTimeSummary({ days }: { days: ReturnType<typeof findFreeSlots> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>本周可战斗时间</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">恐龙侠已侦察完你的课表地图。</p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {days.slice(0, 5).map((day) => (
            <div className="rounded-lg bg-secondary p-3" key={day.date}>
              <p className="text-sm font-semibold">{getWeekdayLabel(day.weekday)}</p>
              <p className="mt-1 text-lg font-bold">{formatDuration(day.totalFreeMinutes)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCourseView({ courses }: { courses: Course[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>一周课表视图</CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            {emptyStateText}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-7">
            {weekdayLabels.map((label, index) => {
              const weekday = index + 1;
              const dayCourses = courses.filter((course) => course.weekday === weekday);

              return (
                <div className="rounded-lg border bg-background p-3" key={label}>
                  <p className="mb-2 text-sm font-semibold text-primary">{label}</p>
                  <div className="space-y-2">
                    {dayCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无课程</p>
                    ) : (
                      dayCourses.map((course) => (
                        <div
                          className="rounded-lg border-l-4 bg-card p-2 text-sm"
                          key={course.id}
                          style={{ borderLeftColor: course.color }}
                        >
                          <p className="font-semibold">{course.name}</p>
                          <p className="text-muted-foreground">{formatCourseTime(course)}</p>
                          <p className="text-muted-foreground">{course.location}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseForm({
  editingId,
  form,
  isSaving,
  onCancel,
  onSubmit,
  updateForm
}: {
  editingId: string | null;
  form: CourseFormState;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  updateForm: <Key extends keyof CourseFormState>(key: Key, value: CourseFormState[Key]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingId ? "编辑课程" : "添加课程"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block space-y-1 text-sm font-medium">
            <span>课程名</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              onChange={(event) => updateForm("name", event.target.value)}
              value={form.name}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm font-medium">
              <span>老师</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("teacher", event.target.value)}
                value={form.teacher}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>教室</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("location", event.target.value)}
                value={form.location}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>星期</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("weekday", Number(event.target.value))}
                value={form.weekday}
              >
                {weekdayLabels.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>开始时间</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("startTime", event.target.value)}
                type="time"
                value={form.startTime}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>结束时间</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("endTime", event.target.value)}
                type="time"
                value={form.endTime}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block space-y-1 text-sm font-medium">
              <span>开始周</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                min={1}
                max={30}
                onChange={(event) => updateForm("startWeek", Number(event.target.value))}
                type="number"
                value={form.startWeek}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>结束周</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                min={1}
                max={30}
                onChange={(event) => updateForm("endWeek", Number(event.target.value))}
                type="number"
                value={form.endWeek}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>单双周</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("weekType", event.target.value as CourseWeekType)}
                value={form.weekType}
              >
                <option value="all">每周</option>
                <option value="odd">单周</option>
                <option value="even">双周</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>颜色</span>
              <input
                className="h-10 w-full rounded-lg border bg-background px-2 py-1"
                onChange={(event) => updateForm("color", event.target.value)}
                type="color"
                value={form.color}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              {editingId ? "保存修改" : "添加课程"}
            </Button>
            {editingId ? (
              <Button onClick={onCancel} type="button" variant="secondary">
                取消编辑
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CourseList({
  courses,
  deleteCourse,
  editCourse
}: {
  courses: Course[];
  deleteCourse: (courseId: string) => void;
  editCourse: (course: Course) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>课程列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.length === 0 ? (
          <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            {emptyStateText}
          </p>
        ) : (
          courses.map((course) => (
            <article className="rounded-lg border bg-background p-3" key={course.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{course.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getWeekdayLabel(course.weekday)} {formatCourseTime(course)} · 第{" "}
                    {course.startWeek}-{course.endWeek} 周 · {getWeekTypeLabel(course.weekType)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.location || "未填写教室"} · {course.teacher || "未填写老师"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    aria-label={`编辑${course.name}`}
                    onClick={() => editCourse(course)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`删除${course.name}`}
                    onClick={() => deleteCourse(course.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string; errors?: string[] };

  if (!response.ok) {
    throw new Error(data.error ?? data.errors?.join(" ") ?? "保存失败，请稍后重试");
  }

  return data;
}
