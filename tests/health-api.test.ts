import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn()
  }
}));

import { GET } from "@/app/api/health/route";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

describe("健康检查 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("数据库可用时返回 ok", async () => {
    mockedPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.database).toBe("ok");
    expect(typeof data.timestamp).toBe("string");
    expect(data).not.toHaveProperty("DATABASE_URL");
  });

  it("数据库不可用时返回中文错误且不暴露连接串", async () => {
    mockedPrisma.$queryRaw.mockRejectedValueOnce(new Error("password leaked"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      status: "error",
      database: "error",
      message: "数据库连接失败"
    });
  });
});
