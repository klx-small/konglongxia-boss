import { NextResponse } from "next/server";

import { setupDemoData } from "@/lib/demo/setup-demo";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_SETUP !== "true") {
    return NextResponse.json({ error: "生产环境默认关闭一键 Demo。" }, { status: 404 });
  }

  try {
    const result = await setupDemoData();

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "创建 Demo 失败，请稍后再试。" }, { status: 500 });
  }
}
