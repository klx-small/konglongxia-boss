import { expect, test } from "@playwright/test";

import { disconnectPrisma, runNpmScript } from "./helpers";

test.afterAll(async () => {
  await disconnectPrisma();
});

test("首页一键 Demo 可以进入今日副本", async ({ page }) => {
  await runNpmScript("db:reset");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "下一步行动中心" })).toBeVisible();
  await expect(page.getByText("先让恐龙侠侦察你的课表地图")).toBeVisible();

  await page.getByRole("button", { name: "一键体验恐龙侠" }).click();

  await expect(page).toHaveURL(/\/battle\/today|\/schedule/);

  if (page.url().includes("/schedule")) {
    await expect(page.getByRole("heading", { name: "本周战斗路线" })).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: "今日副本" })).toBeVisible();
  await expect(page.getByText("副本清单")).toBeVisible();
  await expect(page.getByRole("heading", { name: "四级巨龙" })).toBeVisible();
});
