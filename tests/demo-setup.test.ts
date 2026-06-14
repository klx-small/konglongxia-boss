import { describe, expect, it, vi } from "vitest";

import { setupDemoData, type DemoSetupStore } from "@/lib/demo/setup-demo";

describe("一键 Demo 初始化", () => {
  it("没有数据时会创建 Demo 并返回今日副本入口", async () => {
    const store: DemoSetupStore = {
      countExistingData: vi.fn().mockResolvedValue(0),
      createDemoData: vi.fn().mockResolvedValue({
        goalId: "demo-goal",
        scheduleBlockCount: 6,
        todayQuestCount: 2
      })
    };

    const result = await setupDemoData({ store });

    expect(result.created).toBe(true);
    expect(result.entryUrl).toBe("/battle/today");
    expect(result.message).toBe("示例战役已准备好，马上开始今日副本吧。");
    expect(store.createDemoData).toHaveBeenCalledTimes(1);
  });

  it("已有数据时不会重复创建 Demo", async () => {
    const store: DemoSetupStore = {
      countExistingData: vi.fn().mockResolvedValue(3),
      createDemoData: vi.fn()
    };

    const result = await setupDemoData({ store });

    expect(result.created).toBe(false);
    expect(result.message).toBe("你已经有战役数据了，无需重复创建 Demo。");
    expect(store.createDemoData).not.toHaveBeenCalled();
  });

});
