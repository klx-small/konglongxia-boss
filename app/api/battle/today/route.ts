import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/analytics/track-event";
import { getTodayBattleData } from "@/lib/battle/today-api";
import { formatDatabaseError } from "@/lib/database-error";
import { demoGoalUserId } from "@/lib/goals/goal-api";

export async function GET() {
  try {
    const data = await getTodayBattleData();
    await trackEvent({
      userId: demoGoalUserId,
      eventName: "today_battle_viewed",
      entityType: "battle",
      metadata: { count: data.quests.length }
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "获取今日副本失败，请稍后重试。") },
      { status: 500 }
    );
  }
}
