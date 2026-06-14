import { afterEach, describe, expect, it, vi } from "vitest";

import { decomposeGoal } from "@/lib/ai/decompose-goal";
import { validateAiDecomposition } from "@/lib/ai/validate-ai-decomposition";
import type { AiDecompositionResult } from "@/lib/ai/types";
import type { Goal } from "@/lib/types";

const deepseekCreateMock = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return {
    chat: {
      completions: {
        create: deepseekCreateMock
      }
    }
    };
  })
}));

const baseGoal: Goal = {
  id: "goal-cet4",
  userId: "demo-user",
  title: "英语四级冲刺",
  description: "准备六月四级考试",
  goalType: "certificate",
  deadline: "2026-07-01",
  currentLevel: "基础一般",
  dailyAvailableMinutes: 60,
  intensity: "standard",
  status: "active",
  bossName: "四级巨龙",
  bossHp: 1200,
  bossMaxHp: 1200,
  difficulty: 2,
  bossDescription: "「英语四级冲刺」已经变成 四级巨龙。难度 2 星，准备开始战役。"
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("decomposeGoal AI Provider", () => {
  it("AI_PROVIDER=mock 时使用本地模板", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("mock");
    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(deepseekCreateMock).not.toHaveBeenCalled();
  });

  it("ENABLE_DEEPSEEK=false 时即使 AI_PROVIDER=deepseek 也使用 mock", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("ENABLE_DEEPSEEK", "false");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("mock");
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(deepseekCreateMock).not.toHaveBeenCalled();
  });

  it("AI_PROVIDER=deepseek 但缺少 DEEPSEEK_API_KEY 时 fallback", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "");

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("DeepSeek 调用失败，已使用本地模板生成战役。");
    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it("AI_PROVIDER=proxy 但 DeepSeek 调用失败时 fallback", async () => {
    vi.stubEnv("AI_PROVIDER", "proxy");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://proxy.example.com");
    deepseekCreateMock.mockRejectedValueOnce(new Error("network fail"));

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("DeepSeek 调用失败，已使用本地模板生成战役。");
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it("DeepSeek 返回非法 JSON 时 fallback", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    deepseekCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: "这不是 JSON" } }]
    });

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("fallback");
    expect(result.milestones.length).toBeGreaterThan(0);
  });

  it("DeepSeek 返回字段缺失时 fallback", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    deepseekCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ milestones: [{ title: "词汇" }] }) } }]
    });

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("fallback");
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  it("DeepSeek 返回合法 JSON 时返回 deepseek source", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    deepseekCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(createValidAiResult()) } }]
    });

    const result = await decomposeGoal(baseGoal);

    expect(result.source).toBe("deepseek");
    expect(result.milestones[0].title).toBe("词汇关卡");
    expect(result.tasks[0].title).toBe("高频词速刷");
  });
});

describe("validateAiDecomposition", () => {
  it("能识别非法 taskType", () => {
    const result = validateAiDecomposition(
      {
        milestones: [
          {
            ...createValidAiResult().milestones[0],
            tasks: [
              {
                ...createValidAiResult().milestones[0].tasks[0],
                taskType: "dragon" as never
              }
            ]
          }
        ]
      },
      baseGoal
    );

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("任务类型");
  });

  it("能识别 deadline 晚于 goal.deadline", () => {
    const result = validateAiDecomposition(
      {
        milestones: [
          {
            ...createValidAiResult().milestones[0],
            dueDate: "2026-07-02",
            tasks: [
              {
                ...createValidAiResult().milestones[0].tasks[0],
                deadline: "2026-07-02"
              }
            ]
          }
        ]
      },
      baseGoal
    );

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("晚于目标截止日期");
  });
});

function createValidAiResult(): AiDecompositionResult {
  return {
    milestones: [
      {
        title: "词汇关卡",
        description: "清理四级高频词。",
        order: 1,
        dueDate: "2026-06-20",
        tasks: [
          {
            title: "高频词速刷",
            description: "完成 50 个高频词记忆并复盘。",
            estimatedMinutes: 30,
            difficulty: 2,
            priority: 4,
            deadline: "2026-06-20",
            taskType: "small_monster",
            xpReward: 60
          }
        ]
      }
    ]
  };
}
