import { NextResponse } from "next/server";

import {
  buildDeploymentReadiness,
  isInternalAccessAllowed
} from "@/lib/internal/deployment-readiness";

export async function GET(request: Request) {
  return handleDeploymentReadinessGet(request);
}

export async function handleDeploymentReadinessGet(
  _request: Request,
  deps: {
    build?: typeof buildDeploymentReadiness;
  } = {}
) {
  if (!isInternalAccessAllowed()) {
    return NextResponse.json({ error: "真实内测部署检查不可用。" }, { status: 404 });
  }

  try {
    return NextResponse.json(await (deps.build ?? buildDeploymentReadiness)());
  } catch {
    return NextResponse.json({ error: "读取部署检查失败。" }, { status: 500 });
  }
}
