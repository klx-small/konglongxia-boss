import { exec } from "node:child_process";
import { promisify } from "node:util";

import { prisma } from "../../lib/prisma";

const execAsync = promisify(exec);
const demoUserId = "demo-user";

export async function runNpmScript(script: "db:reset" | "db:seed") {
  const command = process.platform === "win32" ? `npm.cmd run ${script}` : `npm run ${script}`;
  const { stdout, stderr } = await execAsync(command, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test"
    },
    windowsHide: true
  });

  if (stdout) {
    console.log(sanitizeCommandOutput(stdout));
  }

  if (stderr) {
    console.warn(sanitizeCommandOutput(stderr));
  }
}

export function futureDateInput(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export async function prepareExpiredScheduleBlock() {
  const block = await prisma.scheduleBlock.findFirst({
    where: {
      userId: demoUserId,
      status: "scheduled"
    },
    include: {
      task: true
    },
    orderBy: {
      startTime: "asc"
    }
  });

  if (!block) {
    throw new Error("没有可用于 missed 测试的已排程副本。");
  }

  const now = new Date();
  const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const safeEnd = now.getTime() - 5 * 60_000;

  if (safeEnd <= todayStart.getTime()) {
    throw new Error("当前时间太接近当天开始，无法稳定创建今天已过期的副本。");
  }

  const endTime = new Date(safeEnd);
  const startTime = new Date(Math.max(todayStart.getTime() + 60_000, endTime.getTime() - 30 * 60_000));

  await prisma.$transaction([
    prisma.scheduleBlock.update({
      where: { id: block.id },
      data: {
        startTime,
        endTime,
        status: "scheduled",
        source: "auto"
      }
    }),
    prisma.task.update({
      where: { id: block.taskId },
      data: {
        status: "scheduled"
      }
    })
  ]);

  return {
    scheduleBlockId: block.id,
    taskId: block.taskId,
    taskTitle: block.task.title
  };
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

function sanitizeCommandOutput(output: string): string {
  return output
    .replace(/postgresql:\/\/[^\s"']+/g, "[DATABASE_URL]")
    .replace(/DATABASE_URL=(?:"[^"]*"|'[^']*'|\S+)/g, "DATABASE_URL=[hidden]")
    .trim();
}
