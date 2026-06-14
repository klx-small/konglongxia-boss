import { demoGoalUserId } from "@/lib/goals/goal-api";
import { isInternalAccessAllowed } from "@/lib/internal/metrics";
import { prisma } from "@/lib/prisma";

export type DeploymentCheckStatus = "pass" | "warn" | "fail";

export type DeploymentCheck = {
  key: string;
  title: string;
  description: string;
  status: DeploymentCheckStatus;
  action: string;
};

export type DeploymentReadinessCoreStatus = {
  databaseOk: boolean;
  mockUserExists: boolean;
  courseCount: number;
  goalCount: number;
  scheduleBlockCount: number;
  feedbackCount: number;
  analyticsEventCount: number;
};

export type DeploymentReadinessStore = {
  readCoreStatus: () => Promise<DeploymentReadinessCoreStatus>;
};

export type DeploymentReadinessEnv = Record<string, string | undefined>;

export async function buildDeploymentReadiness({
  store = prismaDeploymentReadinessStore,
  env = process.env
}: {
  store?: DeploymentReadinessStore;
  env?: DeploymentReadinessEnv;
} = {}) {
  const coreStatus = await readCoreStatusSafely(store);
  const environment = buildEnvironment(env);
  const checks = buildChecks(coreStatus, environment);
  const passCount = checks.filter((check) => check.status === "pass").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const failCount = checks.filter((check) => check.status === "fail").length;

  return {
    version: "MVP v0.3 内测准备版",
    generatedAt: new Date().toISOString(),
    environment,
    coreStatus,
    checks,
    summary: {
      passCount,
      warnCount,
      failCount,
      readyForPilot: failCount === 0
    },
    pilotPack: [
      "确认 /internal/readiness 全部没有失败项",
      "运行 npm.cmd run test、npm.cmd run lint、npm.cmd run build、npm.cmd run e2e",
      "准备 5-10 位中文大学生内测同学",
      "让同学按 /internal/test-plan 完成 15-20 分钟体验",
      "测试结束后导出反馈 CSV，并查看 /internal/analytics 异常提醒"
    ]
  };
}

export const prismaDeploymentReadinessStore: DeploymentReadinessStore = {
  async readCoreStatus() {
    await prisma.$queryRaw`SELECT 1`;

    const [mockUser, courseCount, goalCount, scheduleBlockCount, feedbackCount, analyticsEventCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: {
            id: demoGoalUserId
          },
          select: {
            id: true
          }
        }),
        prisma.course.count({ where: { userId: demoGoalUserId } }),
        prisma.goal.count({ where: { userId: demoGoalUserId } }),
        prisma.scheduleBlock.count({ where: { userId: demoGoalUserId } }),
        prisma.feedback.count({ where: { userId: demoGoalUserId } }),
        prisma.analyticsEvent.count({ where: { userId: demoGoalUserId } })
      ]);

    return {
      databaseOk: true,
      mockUserExists: Boolean(mockUser),
      courseCount,
      goalCount,
      scheduleBlockCount,
      feedbackCount,
      analyticsEventCount
    };
  }
};

export { isInternalAccessAllowed };

async function readCoreStatusSafely(store: DeploymentReadinessStore): Promise<DeploymentReadinessCoreStatus> {
  try {
    return await store.readCoreStatus();
  } catch {
    return {
      databaseOk: false,
      mockUserExists: false,
      courseCount: 0,
      goalCount: 0,
      scheduleBlockCount: 0,
      feedbackCount: 0,
      analyticsEventCount: 0
    };
  }
}

function buildEnvironment(env: DeploymentReadinessEnv) {
  const nodeEnv = env.NODE_ENV || "development";
  const aiProvider = env.AI_PROVIDER || "mock";
  const internalToolsEnabled = env.ENABLE_INTERNAL_TOOLS === "true";
  const demoSetupEnabled = env.ENABLE_DEMO_SETUP === "true";

  return {
    nodeEnv,
    aiProvider,
    internalToolsEnabled,
    demoSetupEnabled,
    feedbackUrlStatus: env.FEEDBACK_URL ? "已配置" : "未配置",
    deepSeekKeyStatus: env.DEEPSEEK_API_KEY ? "已配置" : "未配置",
    databaseUrlStatus: env.DATABASE_URL ? "已配置" : "未配置"
  };
}

function buildChecks(
  coreStatus: DeploymentReadinessCoreStatus,
  environment: ReturnType<typeof buildEnvironment>
): DeploymentCheck[] {
  return [
    {
      key: "databaseUrlConfigured",
      title: "DATABASE_URL",
      description: "服务端需要能读取数据库连接地址，但页面不会展示具体内容。",
      status: environment.databaseUrlStatus === "已配置" ? "pass" : "fail",
      action: "在部署环境配置 DATABASE_URL，并确认没有提交 .env。"
    },
    {
      key: "databaseConnected",
      title: "数据库连接",
      description: "PostgreSQL 必须可连接，Prisma 才能读写课表、Boss、反馈和埋点。",
      status: coreStatus.databaseOk ? "pass" : "fail",
      action: "检查 PostgreSQL 是否启动，并重新运行 npx.cmd prisma migrate dev。"
    },
    {
      key: "mockUserReady",
      title: "mock 用户",
      description: "内测 MVP 仍使用 mock userId，需要基础用户存在。",
      status: coreStatus.mockUserExists ? "pass" : "fail",
      action: "运行 npm.cmd run db:seed 或访问一键 Demo 创建基础数据。"
    },
    {
      key: "aiProviderReady",
      title: "AI Provider",
      description: "内测可以使用 mock，也可以配置 DeepSeek；DeepSeek 缺 Key 时会 fallback。",
      status:
        environment.aiProvider === "deepseek" && environment.deepSeekKeyStatus === "未配置" ? "warn" : "pass",
      action: "如果要测试 DeepSeek，请配置 DEEPSEEK_API_KEY；否则保持 AI_PROVIDER=mock。"
    },
    {
      key: "feedbackReady",
      title: "反馈入口",
      description: "未配置 FEEDBACK_URL 时使用内置 /feedback 页面，仍可收集反馈。",
      status: "pass",
      action: "内测前确认 /feedback 能提交，或配置 FEEDBACK_URL 指向外部表单。"
    },
    {
      key: "analyticsReady",
      title: "AnalyticsEvent",
      description: "已有埋点事件可以帮助观察漏斗和异常；空数据也不阻塞首轮内测。",
      status: coreStatus.analyticsEventCount > 0 ? "pass" : "warn",
      action: "运行一键 Demo 或完成一次主流程，让观察面板产生第一批事件。"
    },
    {
      key: "demoDataReady",
      title: "Demo 数据",
      description: "首轮内测建议准备可快速体验的一键 Demo 或 seed 数据。",
      status: coreStatus.courseCount > 0 && coreStatus.goalCount > 0 && coreStatus.scheduleBlockCount > 0 ? "pass" : "warn",
      action: "运行 npm.cmd run db:seed，或让测试者从首页点击“一键体验恐龙侠”。"
    },
    {
      key: "internalToolsGuard",
      title: "内部工具开关",
      description: "internal 页面生产环境默认关闭，只有明确配置时才开放。",
      status: environment.nodeEnv === "production" && environment.internalToolsEnabled ? "warn" : "pass",
      action: "真实生产环境不要开启 ENABLE_INTERNAL_TOOLS；内测部署环境可临时开启。"
    },
    {
      key: "demoSetupGuard",
      title: "一键 Demo 开关",
      description: "一键 Demo 生产环境默认关闭，避免覆盖真实线上使用预期。",
      status: environment.nodeEnv === "production" && environment.demoSetupEnabled ? "warn" : "pass",
      action: "真实生产环境不要开启 ENABLE_DEMO_SETUP；内测部署环境可临时开启。"
    }
  ];
}
