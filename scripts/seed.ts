import { fileURLToPath } from "node:url";

import { demoUserId, ensureDemoSemester } from "@/lib/courses/course-api";
import { toGoalDto, goalPayloadToPrismaData, type GoalPayload } from "@/lib/goals/goal-api";
import { mockDecomposeGoal } from "@/lib/goals/mock-decompose-goal";
import { prisma } from "@/lib/prisma";
import { buildDateRange, buildFreeSlots, formatDateOnly } from "@/lib/scheduler/schedule-api";
import { scheduleTasks } from "@/lib/scheduler/scheduleTasks";
import { splitTasks } from "@/lib/scheduler/splitTasks";
import { resetDevData } from "@/scripts/reset-dev-data";

const seedGoalId = "seed-goal-cet4";

export async function seedDevData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境禁止写入内测 seed 数据。");
  }

  await resetDevData();
  const semester = await ensureDemoSemester();

  await prisma.course.createMany({
    data: [
      {
        id: "seed-course-math",
        userId: demoUserId,
        semesterId: semester.id,
        name: "高等数学",
        teacher: "王老师",
        location: "A101",
        weekday: 1,
        startTime: "08:00",
        endTime: "09:40",
        startWeek: 1,
        endWeek: 16,
        weekType: "all",
        color: "#13795b"
      },
      {
        id: "seed-course-english",
        userId: demoUserId,
        semesterId: semester.id,
        name: "大学英语",
        teacher: "李老师",
        location: "B203",
        weekday: 3,
        startTime: "10:10",
        endTime: "11:50",
        startWeek: 1,
        endWeek: 16,
        weekType: "all",
        color: "#2563eb"
      },
      {
        id: "seed-course-computer",
        userId: demoUserId,
        semesterId: semester.id,
        name: "计算机基础",
        teacher: "张老师",
        location: "C305",
        weekday: 5,
        startTime: "14:00",
        endTime: "15:40",
        startWeek: 1,
        endWeek: 12,
        weekType: "all",
        color: "#f97316"
      }
    ]
  });

  const goalPayload: GoalPayload = {
    userId: demoUserId,
    title: "30 天通过英语四级",
    description: "内测种子目标：用 30 天完成四级词汇、听力、阅读和真题训练。",
    goalType: "certificate",
    deadline: formatDateOnly(addDays(new Date(), 30)),
    currentLevel: "词汇基础一般，听力需要加强。",
    dailyAvailableMinutes: 120,
    intensity: "standard",
    status: "active"
  };
  const goal = await prisma.goal.create({
    data: {
      id: seedGoalId,
      ...goalPayloadToPrismaData(goalPayload)
    }
  });
  const campaign = mockDecomposeGoal(toGoalDto(goal));
  const milestoneIdByOrder = new Map<number, string>();

  for (const milestone of campaign.milestones) {
    const savedMilestone = await prisma.milestone.create({
      data: {
        goalId: goal.id,
        title: milestone.title,
        description: milestone.description,
        order: milestone.order,
        dueDate: parseDateOnly(milestone.dueDate),
        status: milestone.status
      }
    });
    milestoneIdByOrder.set(milestone.order, savedMilestone.id);
  }

  await prisma.task.createMany({
    data: campaign.tasks.map((task) => {
      const milestoneId = milestoneIdByOrder.get(task.milestoneOrder);

      if (!milestoneId) {
        throw new Error("seed 战役阶段生成失败。");
      }

      return {
        goalId: goal.id,
        milestoneId,
        title: task.title,
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        difficulty: task.difficulty,
        priority: task.priority,
        deadline: parseDateOnly(task.deadline),
        taskType: task.taskType,
        xpReward: task.xpReward,
        status: task.status
      };
    })
  });

  const scheduleBlocks = await generateSeedSchedule(goal.id, goal.dailyAvailableMinutes);

  console.log("内测 seed 数据已准备好。");
  console.log(`已创建 mock 用户：${demoUserId}`);
  console.log("已创建课程：高等数学、大学英语、计算机基础。");
  console.log("已创建 Boss 目标：30 天通过英语四级。");
  console.log(`已生成战役：${campaign.milestones.length} 个阶段，${campaign.tasks.length} 个任务。`);
  console.log(`已生成本周副本：${scheduleBlocks.length} 个。`);
}

async function generateSeedSchedule(goalId: string, dailyAvailableMinutes: number) {
  const [tasks, courses] = await Promise.all([
    prisma.task.findMany({
      where: { goalId, status: "pending" },
      orderBy: [{ deadline: "asc" }, { priority: "desc" }]
    }),
    prisma.course.findMany({
      where: { userId: demoUserId }
    })
  ]);
  const dateRange = buildDateRange(new Date(), 7);
  const freeSlots = buildFreeSlots({ courses, dateRange });
  const segments = splitTasks(
    tasks.map((task) => ({
      id: task.id,
      goalId: task.goalId,
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      difficulty: task.difficulty,
      priority: task.priority,
      deadline: formatDateOnly(task.deadline),
      taskType: task.taskType,
      xpReward: task.xpReward
    }))
  );
  const result = scheduleTasks({
    tasks: segments,
    freeSlots,
    userPreferences: { dailyStudyLimitMinutes: dailyAvailableMinutes },
    dateRange
  });

  const savedBlocks = await prisma.$transaction(async (tx) => {
    const blocks = [];

    for (const block of result.scheduleBlocks) {
      const originalTaskId = block.taskId.split("#")[0];
      blocks.push(
        await tx.scheduleBlock.create({
          data: {
            userId: demoUserId,
            goalId,
            taskId: originalTaskId,
            startTime: new Date(block.startTime),
            endTime: new Date(block.endTime),
            status: "scheduled",
            source: "auto"
          }
        })
      );
    }

    const scheduledTaskIds = [...new Set(result.scheduleBlocks.map((block) => block.taskId.split("#")[0]))];

    if (scheduledTaskIds.length > 0) {
      await tx.task.updateMany({
        where: { id: { in: scheduledTaskIds } },
        data: { status: "scheduled" }
      });
    }

    return blocks;
  });

  if (result.unscheduledTasks.length > 0) {
    console.log(`有 ${result.unscheduledTasks.length} 个任务暂时未排入本周。`);
  }

  return savedBlocks;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDevData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : "准备内测 seed 数据失败。");
      await prisma.$disconnect();
      process.exit(1);
    });
}
