import { expect, test } from "@playwright/test";

import { disconnectPrisma, runNpmScript } from "./helpers";

test.afterAll(async () => {
  await disconnectPrisma();
});

test("内测反馈提交后能进入指标闭环", async ({ page }) => {
  await runNpmScript("db:reset");

  await page.goto("/feedback");
  await expect(page.getByRole("heading", { name: "内测反馈" })).toBeVisible();

  await page.getByLabel("反馈内容").fill("希望今日副本入口更醒目一点。");
  await page.getByLabel("当前页面").fill("/");
  await page.getByRole("button", { name: "提交反馈" }).click();

  await expect(page.getByText("收到啦，恐龙侠会认真看你的反馈。")).toBeVisible();

  const response = await page.request.get("/api/internal/metrics");
  expect(response.ok()).toBeTruthy();
  const metrics = (await response.json()) as { analyticsEventCount: number };
  expect(metrics.analyticsEventCount).toBeGreaterThan(0);

  await page.goto("/internal/checklist");
  await expect(page.getByRole("heading", { name: "内测检查清单" })).toBeVisible();
  await expect(page.getByText("是否有 AnalyticsEvent")).toBeVisible();
});
