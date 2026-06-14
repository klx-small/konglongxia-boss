"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const feedbackTypes = [
  { value: "bug", label: "反馈问题" },
  { value: "suggestion", label: "我想要的功能" },
  { value: "confusing", label: "看不懂的地方" },
  { value: "like", label: "我喜欢的体验" },
  { value: "other", label: "其他" }
] as const;

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(form);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.get("type"),
          page: formData.get("page"),
          content: formData.get("content"),
          contact: formData.get("contact"),
          rating: formData.get("rating") || undefined
        })
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "提交失败了，恐龙侠挠了挠头，请稍后再试。");
      }

      form.reset();
      setMessage(data.message ?? "收到啦，恐龙侠会认真看你的反馈。");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "提交失败了，恐龙侠挠了挠头，请稍后再试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>反馈给恐龙侠</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            <span>反馈类型</span>
            <select className="h-11 rounded-lg border bg-background px-3" name="type">
              {feedbackTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>当前页面</span>
            <input
              className="h-11 rounded-lg border bg-background px-3"
              name="page"
              placeholder="/battle/today"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>反馈内容</span>
            <textarea
              className="min-h-32 rounded-lg border bg-background px-3 py-2"
              maxLength={1000}
              name="content"
              placeholder="哪里卡住了？哪里好用？你希望恐龙侠加什么能力？"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>联系方式，可选</span>
            <input className="h-11 rounded-lg border bg-background px-3" name="contact" />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            <span>评分，可选</span>
            <select className="h-11 rounded-lg border bg-background px-3" name="rating">
              <option value="">暂不评分</option>
              <option value="5">5 分，很顺</option>
              <option value="4">4 分，还不错</option>
              <option value="3">3 分，一般</option>
              <option value="2">2 分，有点卡</option>
              <option value="1">1 分，需要大修</option>
            </select>
          </label>

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "正在提交..." : "提交反馈"}
          </Button>

          {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
