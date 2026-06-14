import { NextResponse } from "next/server";

import { buildInternalMetrics, isInternalAccessAllowed } from "@/lib/internal/metrics";

export async function GET() {
  return handleInternalMetricsGet();
}

export async function handleInternalMetricsGet(
  deps: {
    build?: typeof buildInternalMetrics;
  } = {}
) {
  if (!isInternalAccessAllowed()) {
    return NextResponse.json({ error: "内测指标不可用。" }, { status: 404 });
  }

  try {
    return NextResponse.json(await (deps.build ?? buildInternalMetrics)());
  } catch {
    return NextResponse.json({ error: "读取内测指标失败。" }, { status: 500 });
  }
}
