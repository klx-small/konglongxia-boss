import { fileURLToPath } from "node:url";

import { demoUserId } from "@/lib/courses/course-api";
import { prisma } from "@/lib/prisma";

export async function resetDevData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境禁止清空开发数据。");
  }

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {
      nickname: "恐龙侠",
      timezone: "Asia/Shanghai",
      xp: 0,
      level: 1
    },
    create: {
      id: demoUserId,
      nickname: "恐龙侠",
      timezone: "Asia/Shanghai",
      xp: 0,
      level: 1
    }
  });

  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({ where: { userId: demoUserId } }),
    prisma.feedback.deleteMany({ where: { userId: demoUserId } }),
    prisma.battleLog.deleteMany({ where: { userId: demoUserId } }),
    prisma.scheduleBlock.deleteMany({ where: { userId: demoUserId } }),
    prisma.task.deleteMany({ where: { goal: { userId: demoUserId } } }),
    prisma.milestone.deleteMany({ where: { goal: { userId: demoUserId } } }),
    prisma.goal.deleteMany({ where: { userId: demoUserId } }),
    prisma.course.deleteMany({ where: { userId: demoUserId } }),
    prisma.semester.deleteMany({ where: { userId: demoUserId } }),
    prisma.user.update({
      where: { id: demoUserId },
      data: {
        xp: 0,
        level: 1
      }
    })
  ]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  resetDevData()
    .then(async () => {
      console.log("开发数据已清空，已保留基础 mock 用户。");
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : "清空开发数据失败。");
      await prisma.$disconnect();
      process.exit(1);
    });
}
