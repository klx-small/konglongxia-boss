import { expect, test } from "@playwright/test";

import { disconnectPrisma, runNpmScript } from "./helpers";

test.afterAll(async () => {
  await disconnectPrisma();
});

test("一键 Demo 和反馈后可以查看内测观察面板", async ({ page }) => {
  await runNpmScript("db:reset");

  await page.goto("/internal/readiness");
  await expect(page.getByRole("heading", { name: "真实内测部署检查" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "部署检查项" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "首轮内测准备包" })).toBeVisible();

  await page.goto("/internal/test-plan");
  await expect(page.getByRole("heading", { name: "恐龙侠内测体验任务" })).toBeVisible();
  await expect(page.getByText("请按顺序体验 15 分钟，最后留一条反馈")).toBeVisible();
  await page.getByRole("link", { name: "提交反馈" }).click();
  await expect(page).toHaveURL(/\/feedback/);

  await page.getByLabel("反馈内容").fill("任务清单入口测试反馈。");
  await page.getByLabel("当前页面").fill("/internal/test-plan");
  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByText("收到啦，恐龙侠会认真看你的反馈。")).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "一键体验恐龙侠" }).click();
  await expect(page).toHaveURL(/\/battle\/today|\/schedule/);

  await page.goto("/feedback");
  await page.getByLabel("反馈内容").fill("观察面板测试反馈。");
  await page.getByLabel("当前页面").fill("/battle/today");
  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByText("收到啦，恐龙侠会认真看你的反馈。")).toBeVisible();

  await page.goto("/internal/analytics");
  await expect(page.getByRole("heading", { name: "内测观察面板" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Onboarding 漏斗" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 稳定性" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "用户漏斗表" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "内测异常提醒" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近反馈" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "导出反馈 CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain("feedback-export");
  expect(await download.failure()).toBeNull();
});
