import { expect, test } from "@playwright/test";

import { disconnectPrisma, futureDateInput, runNpmScript } from "./helpers";

test.afterAll(async () => {
  await disconnectPrisma();
});

test("主流程：创建 Boss、生成战役、生成本周副本并完成今日副本", async ({ page }) => {
  await runNpmScript("db:reset");

  await page.goto("/debug");
  await expect(page.getByRole("heading", { name: "内测调试面板" })).toBeVisible();
  await expect(page.getByText("连接状态")).toBeVisible();
  await expect(page.getByText("已连接")).toBeVisible();

  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "课表" })).toBeVisible();

  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: "Boss 目标" })).toBeVisible();
  await page.getByRole("link", { name: "创建 Boss 目标" }).click();

  await page.getByLabel("目标名称").fill("30 天通过英语四级");
  await page.getByLabel("目标类型").selectOption("certificate");
  await page.getByLabel("截止日期").fill(futureDateInput(30));
  await page.getByLabel("当前水平").fill("词汇基础一般，听力需要加强。");
  await page.getByLabel("每天最多学习时间").fill("120");
  await page.getByLabel("目标描述").fill("用 30 天完成四级词汇、听力、阅读和真题训练。");
  await page.getByRole("button", { name: "生成 Boss" }).click();

  await expect(page.locator("h1", { hasText: "四级巨龙" })).toBeVisible();
  await expect(page.getByText("目标：30 天通过英语四级")).toBeVisible();

  await page.getByRole("button", { name: "生成战役" }).click();
  await expect(page.getByText("恐龙侠已为你生成 Boss 战役。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "阶段关卡" })).toBeVisible();
  await expect(page.getByText("高频词速刷")).toBeVisible();

  await page.getByRole("button", { name: "生成本周副本" }).click();
  await expect(page.getByText("恐龙侠已安排好本周战斗路线！")).toBeVisible();

  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "本周战斗路线" })).toBeVisible();
  await expect(page.getByText("XP").first()).toBeVisible();
  expect(await page.getByText("四级巨龙").count()).toBeGreaterThan(0);

  await page.goto("/battle/today");
  await expect(page.getByRole("heading", { name: "今日副本" })).toBeVisible();
  await expect(page.getByText("副本清单")).toBeVisible();

  const completeButton = page.getByRole("button", { name: /完成/ }).first();
  await expect(completeButton).toBeVisible();
  await completeButton.click();

  await expect(page.getByText("恐龙侠已完成攻击，Boss 掉血了！")).toBeVisible();
  await expect(page.getByText("已完成").first()).toBeVisible();
});
