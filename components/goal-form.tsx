"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Crosshair, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { goalTypeLabels, intensityLabels } from "@/lib/goals/goal-format";
import type { Goal, GoalIntensity, GoalType } from "@/lib/types";

const goalTypes = Object.keys(goalTypeLabels) as GoalType[];
const intensities = Object.keys(intensityLabels) as GoalIntensity[];

const emptyForm = {
  title: "",
  description: "",
  goalType: "exam" as GoalType,
  deadline: "",
  currentLevel: "",
  dailyAvailableMinutes: 60,
  intensity: "standard" as GoalIntensity
};

type GoalFormState = typeof emptyForm;

type GoalResponse = {
  goal?: Goal;
  error?: string;
};

export function GoalForm() {
  const router = useRouter();
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateForm<Key extends keyof GoalFormState>(key: Key, value: GoalFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("请填写目标名称。");
      return;
    }

    if (!form.deadline) {
      setError("请选择截止日期。");
      return;
    }

    setIsSaving(true);

    try {
      const data = await requestJson<GoalResponse>("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          currentLevel: form.currentLevel.trim()
        })
      });

      if (data.goal) {
        router.push(`/goals/${data.goal.id}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存目标失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">创建 Boss</h1>
          <p className="text-sm text-muted-foreground">填写目标后，恐龙侠会把它包装成 Boss。</p>
        </div>
        <Button asChild className="shrink-0" variant="secondary">
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
        </Button>
      </section>

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm font-medium text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>目标信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitGoal}>
            <label className="block space-y-1 text-sm font-medium">
              <span>目标名称</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("title", event.target.value)}
                value={form.title}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium">
              <span>目标类型</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("goalType", event.target.value as GoalType)}
                value={form.goalType}
              >
                {goalTypes.map((goalType) => (
                  <option key={goalType} value={goalType}>
                    {goalTypeLabels[goalType]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm font-medium">
              <span>截止日期</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("deadline", event.target.value)}
                type="date"
                value={form.deadline}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium">
              <span>当前水平</span>
              <textarea
                className="min-h-24 w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("currentLevel", event.target.value)}
                value={form.currentLevel}
              />
            </label>

            <label className="block space-y-1 text-sm font-medium">
              <span>每天最多学习时间</span>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2"
                min={25}
                onChange={(event) => updateForm("dailyAvailableMinutes", Number(event.target.value))}
                type="number"
                value={form.dailyAvailableMinutes}
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium">强度选择</p>
              <div className="grid grid-cols-3 gap-2">
                {intensities.map((intensity) => (
                  <Button
                    key={intensity}
                    onClick={() => updateForm("intensity", intensity)}
                    type="button"
                    variant={form.intensity === intensity ? "default" : "secondary"}
                  >
                    {intensityLabels[intensity]}
                  </Button>
                ))}
              </div>
            </div>

            <label className="block space-y-1 text-sm font-medium">
              <span>目标描述</span>
              <textarea
                className="min-h-28 w-full rounded-lg border bg-background px-3 py-2"
                onChange={(event) => updateForm("description", event.target.value)}
                value={form.description}
              />
            </label>

            <Button className="w-full" disabled={isSaving} type="submit">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              生成 Boss
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "保存目标失败，请稍后重试。");
  }

  return data;
}
