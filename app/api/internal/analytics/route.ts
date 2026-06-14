import { NextResponse } from "next/server";

import { buildInternalAnalytics, isInternalAccessAllowed } from "@/lib/internal/analytics";

export async function GET(request: Request) {
  return handleInternalAnalyticsGet(request);
}

export async function handleInternalAnalyticsGet(
  request: Request,
  deps: {
    build?: typeof buildInternalAnalytics;
  } = {}
) {
  if (!isInternalAccessAllowed()) {
    return NextResponse.json({ error: "内测观察面板不可用。" }, { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? "7");
    const eventName = url.searchParams.get("eventName") ?? undefined;

    return NextResponse.json(await (deps.build ?? buildInternalAnalytics)({ days, eventName }));
  } catch {
    return NextResponse.json({ error: "读取内测观察数据失败。" }, { status: 500 });
  }
}
