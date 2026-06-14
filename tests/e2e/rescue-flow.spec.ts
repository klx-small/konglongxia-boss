import { expect, test } from "@playwright/test";

import { disconnectPrisma, prepareExpiredScheduleBlock, runNpmScript } from "./helpers";

test.afterAll(async () => {
  await disconnectPrisma();
});

test("missed 后可以单个补救并在结算页看到结果", async ({ page }) => {
  await runNpmScript("db:seed");
  await prepareExpiredScheduleBlock();

  const detectResponse = await page.request.post("/api/battle/detect-missed");
  expect(detectResponse.ok()).toBeTruthy();
  const detectData = (await detectResponse.json()) as { missedBlocks?: unknown[] };
  expect(detectData.missedBlocks?.length).toBeGreaterThan(0);

  await page.goto("/battle/today");
  await expect(page.getByRole("heading", { name: "今日副本" })).toBeVisible();
  await expect(page.getByText("有任务错过了，恐龙侠可以帮你生成补救副本。")).toBeVisible();
  expect(await page.getByText("已错过").count()).toBeGreaterThan(0);

  const rescueButton = page.getByRole("button", { name: /补救/ }).filter({ hasText: "补救这个小怪" }).first();
  await expect(rescueButton).toBeVisible();
  await rescueButton.click();

  await expect(page.getByText("恐龙侠已为这个小怪安排补救副本。")).toBeVisible();
  await expect(page.getByText(/本次补救/)).toBeVisible();

  await page.goto("/battle/summary");
  await expect(page.getByRole("heading", { name: "战斗结算" })).toBeVisible();
  await expect(page.getByText(/错过 \d+ 个小怪，Boss 回血/)).toBeVisible();
  await expect(page.getByText(/恐龙侠今天帮你补救了/)).toBeVisible();
  await expect(page.getByText("Boss 回血", { exact: true })).toBeVisible();
  await expect(page.getByText("新增补救", { exact: true })).toBeVisible();
});
