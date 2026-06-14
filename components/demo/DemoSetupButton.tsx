"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type DemoSetupResponse = {
  created?: boolean;
  message?: string;
  entryUrl?: string;
  error?: string;
};

export function DemoSetupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function setupDemo() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/demo/setup", { method: "POST" });
      const data = (await response.json()) as DemoSetupResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "创建 Demo 失败，请稍后再试。");
      }

      setMessage(data.message ?? "示例数据已准备好。");

      if (data.created && data.entryUrl) {
        window.location.assign(data.entryUrl);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建 Demo 失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        不想手动填写？先用示例数据体验完整流程。
      </p>
      <Button className="w-full" disabled={isLoading} onClick={setupDemo} type="button">
        <Sparkles className="h-4 w-4" />
        {isLoading ? "正在准备 Demo..." : "一键体验恐龙侠"}
      </Button>
      {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
    </div>
  );
}
