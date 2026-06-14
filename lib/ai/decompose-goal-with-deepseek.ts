import type { Goal } from "@/lib/types";
import { createDeepSeekClient, getDeepSeekModel } from "@/lib/ai/deepseek-client";
import type { AiDecompositionResult } from "@/lib/ai/types";
import { assertValidAiDecomposition } from "@/lib/ai/validate-ai-decomposition";

export async function decomposeGoalWithDeepSeek(goal: Goal): Promise<AiDecompositionResult> {
  const client = createDeepSeekClient();
  const response = await client.chat.completions.create({
    model: getDeepSeekModel(),
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "你是“恐龙侠打Boss”的 AI 战役策划师。你需要把中文大学生的学习目标拆成 Boss 战役。输出必须是严格 JSON。不要输出 Markdown。不要输出解释。任务必须具体、可执行、适合大学生。任务时长一般 25-60 分钟。Boss 战任务可以 90-120 分钟。不要安排超过目标截止日期的任务。任务类型只能使用指定枚举。"
      },
      {
        role: "user",
        content: buildUserPrompt(goal)
      }
    ]
  });
  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("DeepSeek 未返回可解析内容。");
  }

  const parsed = parseAiJson(content);
  assertValidAiDecomposition(parsed, goal);

  return parsed;
}

function buildUserPrompt(goal: Goal): string {
  return JSON.stringify({
    instruction:
      "请只返回 JSON，不要 Markdown，不要解释文字。JSON 结构必须是 { milestones: [{ title, description, order, dueDate, tasks: [{ title, description, estimatedMinutes, difficulty, priority, deadline, taskType, xpReward }] }] }。",
    allowedTaskTypes: [
      "small_monster",
      "elite_monster",
      "daily_dungeon",
      "boss_battle",
      "rescue_dungeon"
    ],
    goal: {
      title: goal.title,
      goalType: goal.goalType,
      deadline: goal.deadline,
      currentLevel: goal.currentLevel,
      dailyAvailableMinutes: goal.dailyAvailableMinutes,
      intensity: goal.intensity
    }
  });
}

function parseAiJson(content: string): unknown {
  const cleaned = stripMarkdownFence(content.trim());

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("DeepSeek 返回内容不是合法 JSON。");
  }
}

function stripMarkdownFence(content: string): string {
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(content);

  return fenceMatch ? fenceMatch[1].trim() : content;
}
