import type { Goal } from "@/lib/types";
import { trackEvent } from "@/lib/analytics/track-event";
import type { DecomposedCampaign, DecomposedTask } from "@/lib/goals/mock-decompose-goal";
import { mockDecomposeGoal } from "@/lib/goals/mock-decompose-goal";
import { decomposeGoalWithDeepSeek } from "@/lib/ai/decompose-goal-with-deepseek";
import type { AiDecompositionResult, DecomposeGoalResult } from "@/lib/ai/types";

const fallbackReason = "DeepSeek 调用失败，已使用本地模板生成战役。";

export async function decomposeGoal(goal: Goal): Promise<DecomposeGoalResult> {
  const provider = normalizeProvider(process.env.AI_PROVIDER);
  const startedAt = Date.now();

  if (provider === "mock") {
    return {
      source: "mock",
      ...mockDecomposeGoal(goal)
    };
  }

  try {
    const aiResult = await decomposeGoalWithDeepSeek(goal);
    await trackEvent({
      userId: goal.userId ?? "demo-user",
      eventName: "ai_deepseek_success",
      entityType: "ai",
      entityId: goal.id,
      metadata: {
        source: "deepseek",
        durationMs: Date.now() - startedAt
      }
    });

    return {
      source: "deepseek",
      ...aiResultToCampaign(aiResult)
    };
  } catch {
    await trackEvent({
      userId: goal.userId ?? "demo-user",
      eventName: "ai_deepseek_failed",
      entityType: "ai",
      entityId: goal.id,
      metadata: {
        source: "deepseek",
        status: "failed",
        durationMs: Date.now() - startedAt
      }
    });
    await trackEvent({
      userId: goal.userId ?? "demo-user",
      eventName: "ai_fallback_used",
      entityType: "ai",
      entityId: goal.id,
      metadata: {
        source: "fallback",
        status: "used"
      }
    });

    return {
      source: "fallback",
      fallbackReason,
      ...mockDecomposeGoal(goal)
    };
  }
}

function normalizeProvider(value: string | undefined): "mock" | "deepseek" | "proxy" {
  if (process.env.ENABLE_DEEPSEEK === "false") {
    return "mock";
  }

  if (value === "deepseek" || value === "proxy") {
    return value;
  }

  return "mock";
}

function aiResultToCampaign(result: AiDecompositionResult): DecomposedCampaign {
  return {
    milestones: result.milestones.map((milestone) => ({
      title: milestone.title,
      description: milestone.description,
      order: milestone.order,
      dueDate: milestone.dueDate,
      status: milestone.order === 1 ? "active" : "pending"
    })),
    tasks: result.milestones.flatMap((milestone) =>
      milestone.tasks.map(
        (task): DecomposedTask => ({
          milestoneOrder: milestone.order,
          title: task.title,
          description: task.description,
          estimatedMinutes: task.estimatedMinutes,
          difficulty: task.difficulty,
          priority: task.priority,
          deadline: task.deadline,
          taskType: task.taskType,
          xpReward: task.xpReward,
          status: "pending"
        })
      )
    )
  };
}
