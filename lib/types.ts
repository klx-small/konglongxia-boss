export type BossGoal = {
  id: string;
  title: string;
  typeLabel: string;
  bossName: string;
  description: string;
  deadlineDate: string;
  totalHp: number;
  currentHp: number;
  priority: number;
  statusLabel: string;
  stageSummary: string;
  riskLabel: string;
};

export type CourseWeekType = "all" | "odd" | "even";

export type GoalType =
  | "exam"
  | "certificate"
  | "homework"
  | "paper"
  | "project"
  | "habit"
  | "other";

export type GoalIntensity = "relaxed" | "standard" | "sprint";

export type GoalStatus = "active" | "completed" | "paused" | "failed";
export type MilestoneStatus = "pending" | "active" | "completed";
export type TaskStatus = "pending" | "scheduled" | "completed" | "skipped" | "overdue";
export type ScheduleBlockStatus = "scheduled" | "completed" | "missed" | "rescheduled" | "cancelled";
export type ScheduleBlockSource = "auto" | "manual" | "reschedule";
export type TaskType =
  | "small_monster"
  | "elite_monster"
  | "daily_dungeon"
  | "boss_battle"
  | "rescue_dungeon";

export type EditableCourse = {
  id: string;
  userId?: string;
  semesterId?: string;
  name: string;
  teacher: string;
  location: string;
  weekday: number;
  startTime: string;
  endTime: string;
  startWeek: number;
  endWeek: number;
  weekType: CourseWeekType;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Course = EditableCourse & {
  weekdayLabel?: string;
  startLocalTime?: string;
  endLocalTime?: string;
  startAtUtc?: string;
  endAtUtc?: string;
  sourceLabel?: string;
};

export type Goal = {
  id: string;
  userId?: string;
  title: string;
  description: string;
  goalType: GoalType;
  deadline: string;
  currentLevel: string;
  dailyAvailableMinutes: number;
  intensity: GoalIntensity;
  status: GoalStatus;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  difficulty: number;
  bossDescription: string;
  milestones?: Milestone[];
  tasks?: Task[];
  createdAt?: string;
  updatedAt?: string;
};

export type Milestone = {
  id: string;
  goalId: string;
  title: string;
  description: string;
  order: number;
  dueDate: string;
  status: MilestoneStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type Task = {
  id: string;
  goalId: string;
  milestoneId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: string;
  taskType: TaskType;
  xpReward: number;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduleBlock = {
  id: string;
  userId: string;
  goalId: string;
  taskId: string;
  startTime: string;
  endTime: string;
  status: ScheduleBlockStatus;
  source: ScheduleBlockSource;
  goalTitle?: string;
  bossName?: string;
  taskTitle?: string;
  taskType?: TaskType;
  xpReward?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DailyQuest = {
  id: string;
  taskId?: string;
  bossGoalId: string;
  bossName: string;
  title: string;
  description: string;
  scheduledTimeLabel: string;
  estimatedMinutes: number;
  damage: number;
  xpReward: number;
  status: "pending" | "in_progress" | "completed" | "missed" | "rescheduled";
  statusLabel: string;
  source?: ScheduleBlockSource;
};

export type UserProgress = {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
};

export type BattleSettlement = {
  date: string;
  totalQuestCount?: number;
  totalDamage: number;
  totalXp: number;
  completedQuestCount: number;
  missedQuestCount: number;
  bossHpRecovered: number;
  summary: string;
  rescueQuestCount?: number;
  movedBlockCount?: number;
  tomorrowStudyMinutes?: number;
};
