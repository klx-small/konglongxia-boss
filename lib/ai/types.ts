import type { DecomposedCampaign, TaskType } from "@/lib/goals/mock-decompose-goal";

export type AiTask = {
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: string;
  taskType: TaskType;
  xpReward: number;
};

export type AiMilestone = {
  title: string;
  description: string;
  order: number;
  dueDate: string;
  tasks: AiTask[];
};

export type AiDecompositionResult = {
  milestones: AiMilestone[];
};

export type DecomposeGoalSource = "mock" | "deepseek" | "fallback";

export type DecomposeGoalResult = DecomposedCampaign & {
  source: DecomposeGoalSource;
  fallbackReason?: string;
};
