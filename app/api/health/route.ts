import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "ok",
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        message: "数据库连接失败"
      },
      { status: 503 }
    );
  }
}
