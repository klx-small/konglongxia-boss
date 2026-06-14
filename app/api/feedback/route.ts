import { NextResponse } from "next/server";

import { submitFeedback } from "@/lib/feedback/feedback-service";
import { demoGoalUserId, ensureDemoGoalUser } from "@/lib/goals/goal-api";

export async function POST(request: Request) {
  return handleFeedbackPost(request);
}

export async function handleFeedbackPost(
  request: Request,
  deps: {
    submit?: typeof submitFeedback;
    ensureUser?: typeof ensureDemoGoalUser;
  } = {}
) {
  try {
    await (deps.ensureUser ?? ensureDemoGoalUser)();
    const result = await (deps.submit ?? submitFeedback)({
      userId: demoGoalUserId,
      input: await request.json()
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提交失败了，恐龙侠挠了挠头，请稍后再试。" },
      { status: 400 }
    );
  }
}
