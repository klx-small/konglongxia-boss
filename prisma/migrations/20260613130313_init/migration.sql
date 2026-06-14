-- CreateEnum
CREATE TYPE "CourseSource" AS ENUM ('MANUAL', 'IMAGE_IMPORT', 'TABLE_IMPORT');

-- CreateEnum
CREATE TYPE "CourseWeekType" AS ENUM ('all', 'odd', 'even');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('exam', 'certificate', 'homework', 'paper', 'project', 'habit', 'other');

-- CreateEnum
CREATE TYPE "GoalIntensity" AS ENUM ('relaxed', 'standard', 'sprint');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'paused', 'failed');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'active', 'completed');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('small_monster', 'elite_monster', 'daily_dungeon', 'boss_battle', 'rescue_dungeon');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'scheduled', 'completed', 'skipped', 'overdue');

-- CreateEnum
CREATE TYPE "BossStatus" AS ENUM ('PLANNING', 'FIGHTING', 'DEFEATED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StageTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DailyQuestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher" TEXT,
    "location" TEXT,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "weekType" "CourseWeekType" NOT NULL DEFAULT 'all',
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goalType" "GoalType" NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "currentLevel" TEXT NOT NULL,
    "dailyAvailableMinutes" INTEGER NOT NULL,
    "intensity" "GoalIntensity" NOT NULL DEFAULT 'standard',
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "bossName" TEXT NOT NULL,
    "bossHp" INTEGER NOT NULL,
    "bossMaxHp" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMinutes" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BossGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "bossName" TEXT NOT NULL,
    "description" TEXT,
    "deadlineAtUtc" TIMESTAMP(3) NOT NULL,
    "totalHp" INTEGER NOT NULL,
    "currentHp" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" "BossStatus" NOT NULL DEFAULT 'PLANNING',
    "aiPlanJson" JSONB,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BossGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageTask" (
    "id" TEXT NOT NULL,
    "bossGoalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "status" "StageTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuest" (
    "id" TEXT NOT NULL,
    "bossGoalId" TEXT NOT NULL,
    "stageTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledStartAtUtc" TIMESTAMP(3) NOT NULL,
    "scheduledEndAtUtc" TIMESTAMP(3) NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "damage" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "status" "DailyQuestStatus" NOT NULL DEFAULT 'PENDING',
    "completedAtUtc" TIMESTAMP(3),
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleSettlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalDamage" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "completedQuestCount" INTEGER NOT NULL,
    "missedQuestCount" INTEGER NOT NULL,
    "bossHpRecovered" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Semester_userId_idx" ON "Semester"("userId");

-- CreateIndex
CREATE INDEX "Course_userId_semesterId_idx" ON "Course"("userId", "semesterId");

-- CreateIndex
CREATE INDEX "Course_userId_weekday_idx" ON "Course"("userId", "weekday");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE INDEX "Goal_deadline_idx" ON "Goal"("deadline");

-- CreateIndex
CREATE INDEX "Milestone_goalId_order_idx" ON "Milestone"("goalId", "order");

-- CreateIndex
CREATE INDEX "Task_goalId_status_idx" ON "Task"("goalId", "status");

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "Task_deadline_idx" ON "Task"("deadline");

-- CreateIndex
CREATE INDEX "BossGoal_userId_status_idx" ON "BossGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "StageTask_bossGoalId_orderIndex_idx" ON "StageTask"("bossGoalId", "orderIndex");

-- CreateIndex
CREATE INDEX "DailyQuest_bossGoalId_status_idx" ON "DailyQuest"("bossGoalId", "status");

-- CreateIndex
CREATE INDEX "DailyQuest_scheduledStartAtUtc_scheduledEndAtUtc_idx" ON "DailyQuest"("scheduledStartAtUtc", "scheduledEndAtUtc");

-- CreateIndex
CREATE UNIQUE INDEX "BattleSettlement_userId_date_key" ON "BattleSettlement"("userId", "date");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossGoal" ADD CONSTRAINT "BossGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTask" ADD CONSTRAINT "StageTask_bossGoalId_fkey" FOREIGN KEY ("bossGoalId") REFERENCES "BossGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_bossGoalId_fkey" FOREIGN KEY ("bossGoalId") REFERENCES "BossGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_stageTaskId_fkey" FOREIGN KEY ("stageTaskId") REFERENCES "StageTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleSettlement" ADD CONSTRAINT "BattleSettlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
