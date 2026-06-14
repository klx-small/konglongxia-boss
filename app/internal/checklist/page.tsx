import { notFound } from "next/navigation";

import { GET as getHealth } from "@/app/api/health/route";
import { InternalChecklist, type InternalChecklistData } from "@/components/internal/InternalChecklist";
import { assertDatabaseAvailable } from "@/lib/database-health";
import { demoGoalUserId } from "@/lib/goals/goal-api";
import { buildInternalMetrics, isInternalAccessAllowed } from "@/lib/internal/metrics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InternalChecklistPage() {
  if (!isInternalAccessAllowed()) {
    notFound();
  }

  const data = await loadChecklistData();

  return <InternalChecklist data={data} />;
}

async function loadChecklistData(): Promise<InternalChecklistData> {
  const databaseOk = await readDatabaseOk();
  const healthOk = await readHealthOk();
  const metrics = databaseOk ? await buildInternalMetrics() : null;
  const today = new Date().toISOString().slice(0, 10);
  const todayQuestCount = databaseOk
    ? await prisma.scheduleBlock.count({
        where: {
          userId: demoGoalUserId,
          status: { not: "cancelled" },
          startTime: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lte: new Date(`${today}T23:59:59.999Z`)
          }
        }
      })
    : 0;

  return {
    databaseOk,
    healthOk,
    hasCourse: Boolean(metrics?.onboardingFunnel.hasCourse),
    hasGoal: Boolean(metrics?.onboardingFunnel.hasGoal),
    hasBattlePlan: Boolean(metrics?.onboardingFunnel.hasBattlePlan),
    hasSchedule: Boolean(metrics?.onboardingFunnel.hasSchedule),
    hasTodayQuest: todayQuestCount > 0,
    canSubmitFeedback: databaseOk,
    hasAnalyticsEvent: Boolean(metrics && metrics.analyticsEventCount > 0),
    aiProvider: process.env.AI_PROVIDER || "mock",
    deepSeekKeyStatus: process.env.DEEPSEEK_API_KEY ? "已配置" : "未配置"
  };
}

async function readHealthOk(): Promise<boolean> {
  try {
    const response = await getHealth();
    return response.status === 200;
  } catch {
    return false;
  }
}

async function readDatabaseOk(): Promise<boolean> {
  try {
    await assertDatabaseAvailable();
    return true;
  } catch {
    return false;
  }
}
