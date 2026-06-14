import { demoUserId, ensureDemoSemester } from "@/lib/courses/course-api";
import { trackEvent, type TrackEventInput } from "@/lib/analytics/track-event";
import { toGoalDto, goalPayloadToPrismaData, type GoalPayload } from "@/lib/goals/goal-api";
import { mockDecomposeGoal } from "@/lib/goals/mock-decompose-goal";
import { prisma } from "@/lib/prisma";
import { buildDateRange, buildFreeSlots, formatDateOnly } from "@/lib/scheduler/schedule-api";
import { scheduleTasks } from "@/lib/scheduler/scheduleTasks";
import { splitTasks } from "@/lib/scheduler/splitTasks";

export type DemoSetupResult = {
  created: boolean;
  message: string;
  entryUrl: string;
  goalId?: string;
  scheduleBlockCount?: number;
  todayQuestCount?: number;
};

export type DemoSetupStore = {
  countExistingData: () => Promise<number>;
  createDemoData: () => Promise<{
    goalId: string;
    scheduleBlockCount: number;
    todayQuestCount: number;
  }>;
};

export async function setupDemoData({
  store = prismaDemoStore,
  track = trackEvent
}: {
  store?: DemoSetupStore;
  track?: (event: TrackEventInput) => Promise<unknown>;
} = {}): Promise<DemoSetupResult> {
  await track({
    userId: demoUserId,
    eventName: "demo_setup_started",
    entityType: "demo"
  });
  const existingCount = await store.countExistingData();

  if (existingCount > 0) {
    await track({
      userId: demoUserId,
      eventName: "demo_setup_skipped_existing_data",
      entityType: "demo",
      metadata: { count: existingCount }
    });

    return {
      created: false,
      message: "你已经有战役数据了，无需重复创建 Demo。",
      entryUrl: "/"
    };
  }

  const demo = await store.createDemoData();
  await track({
    userId: demoUserId,
    eventName: "demo_setup_completed",
    entityType: "demo",
    entityId: demo.goalId,
    metadata: {
      blockCount: demo.scheduleBlockCount,
      count: demo.todayQuestCount
    }
  });

  return {
    created: true,
    message: "示例战役已准备好，马上开始今日副本吧。",
    entryUrl: demo.todayQuestCount > 0 ? "/battle/today" : "/schedule",
    ...demo
  };
}

export const prismaDemoStore: DemoSetupStore = {
  async countExistingData() {
    const [courseCount, goalCount, milestoneCount, taskCount, scheduleBlockCount, battleLogCount] =
      await Promise.all([
        prisma.course.count({ where: { userId: demoUserId } }),
        prisma.goal.count({ where: { userId: demoUserId } }),
        prisma.milestone.count({ where: { goal: { userId: demoUserId } } }),
        prisma.task.count({ where: { goal: { userId: demoUserId } } }),
        prisma.scheduleBlock.count({ where: { userId: demoUserId } }),
        prisma.battleLog.count({ where: { userId: demoUserId } })
      ]);

    return courseCount + goalCount + milestoneCount + taskCount + scheduleBlockCount + battleLogCount;
  },

  async createDemoData() {
    const semester = await ensureDemoSemester();

    await prisma.course.createMany({
      data: [
        {
          id: "demo-course-math",
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
          id: "demo-course-english",
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
          id: "demo-course-computer",
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
      description: "示例目标：用 30 天完成四级词汇、听力、阅读和真题训练。",
      goalType: "certificate",
      deadline: formatDateOnly(addDays(new Date(), 30)),
      currentLevel: "词汇基础一般，听力需要加强。",
      dailyAvailableMinutes: 120,
      intensity: "standard",
      status: "active"
    };
    const goal = await prisma.goal.create({
      data: {
        id: "demo-goal-cet4",
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
          throw new Error("Demo 战役阶段生成失败。");
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

    const scheduleBlocks = await generateDemoSchedule(goal.id, goal.dailyAvailableMinutes);
    const today = formatDateOnly(new Date());
    const todayQuestCount = scheduleBlocks.filter(
      (block) => block.startTime.toISOString().slice(0, 10) === today
    ).length;

    return {
      goalId: goal.id,
      scheduleBlockCount: scheduleBlocks.length,
      todayQuestCount
    };
  }
};

async function generateDemoSchedule(goalId: string, dailyAvailableMinutes: number) {
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

  return prisma.$transaction(async (tx) => {
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
