import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { handleDeploymentReadinessGet } from "@/app/api/internal/deployment-readiness/route";
import { InternalDeploymentReadiness } from "@/components/internal/InternalDeploymentReadiness";
import { InternalTestPlan } from "@/components/internal/InternalTestPlan";
import {
  buildDeploymentReadiness,
  type DeploymentReadinessStore
} from "@/lib/internal/deployment-readiness";

describe("真实内测部署检查", () => {
  it("数据库不可用时返回 fail 并给出中文修复建议", async () => {
    const data = await buildDeploymentReadiness({
      store: createStore({ databaseOk: false }),
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:password@localhost:5432/db",
        AI_PROVIDER: "mock"
      }
    });

    expect(data.summary.failCount).toBeGreaterThan(0);
    expect(data.summary.readyForPilot).toBe(false);
    expect(data.checks).toContainEqual(
      expect.objectContaining({
        key: "databaseConnected",
        status: "fail",
        action: "检查 PostgreSQL 是否启动；本地使用 npx.cmd prisma migrate dev，部署环境使用 npx.cmd prisma migrate deploy。"
      })
    );
  });

  it("不会返回 DATABASE_URL 或 DeepSeek Key 等敏感信息", async () => {
    const data = await buildDeploymentReadiness({
      store: createStore(),
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:secret@localhost:5432/db",
        AI_PROVIDER: "deepseek",
        ENABLE_DEEPSEEK: "true",
        DEEPSEEK_API_KEY: "sk-real-key",
        ENABLE_INTERNAL_PAGES: "true"
      }
    });
    const json = JSON.stringify(data);

    expect(json).not.toContain("secret");
    expect(json).not.toContain("sk-real-key");
    expect(data.environment.deepSeekKeyStatus).toBe("已配置");
    expect(data.environment.deepSeekEnabled).toBe(true);
    expect(data.environment.databaseUrlStatus).toBe("已配置");
  });

  it("生产环境开启内部工具时给出 warn", async () => {
    const data = await buildDeploymentReadiness({
      store: createStore(),
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:password@localhost:5432/db",
        AI_PROVIDER: "mock",
        ENABLE_DEEPSEEK: "false",
        ENABLE_INTERNAL_PAGES: "true",
        ENABLE_DEMO_SETUP: "true"
      }
    });

    expect(data.checks).toContainEqual(
      expect.objectContaining({
        key: "internalToolsGuard",
        status: "warn"
      })
    );
    expect(data.checks).toContainEqual(
      expect.objectContaining({
        key: "demoSetupGuard",
        status: "warn"
      })
    );
  });

  it("/api/internal/deployment-readiness 返回部署检查结构", async () => {
    const response = await handleDeploymentReadinessGet(
      new Request("http://127.0.0.1/api/internal/deployment-readiness"),
      {
        build: async () =>
          buildDeploymentReadiness({
            store: createStore(),
            env: {
              NODE_ENV: "development",
              DATABASE_URL: "postgresql://user:password@localhost:5432/db",
              AI_PROVIDER: "mock"
            }
          })
      }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.readyForPilot).toBe(true);
    expect(data.checks.length).toBeGreaterThan(0);
  });

  it("/internal/readiness 页面能渲染部署检查", async () => {
    const data = await buildDeploymentReadiness({
      store: createStore(),
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:password@localhost:5432/db",
        AI_PROVIDER: "mock"
      }
    });

    render(<InternalDeploymentReadiness data={data} />);

    expect(screen.getByRole("heading", { name: "真实内测部署检查" })).toBeInTheDocument();
    expect(screen.getByText("数据库连接")).toBeInTheDocument();
    expect(screen.getByText("首轮内测准备包")).toBeInTheDocument();
  });

  it("/internal/test-plan 展示内测前准备提醒", () => {
    render(<InternalTestPlan />);

    expect(screen.getByText("内测前准备")).toBeInTheDocument();
    expect(screen.getByText("确认 /internal/readiness 全部没有失败项")).toBeInTheDocument();
  });
});

function createStore(overrides: Partial<Awaited<ReturnType<DeploymentReadinessStore["readCoreStatus"]>>> = {}): DeploymentReadinessStore {
  return {
    readCoreStatus: vi.fn().mockResolvedValue({
      databaseOk: true,
      mockUserExists: true,
      courseCount: 2,
      goalCount: 1,
      scheduleBlockCount: 3,
      feedbackCount: 1,
      analyticsEventCount: 5,
      ...overrides
    })
  };
}
