export type OnboardingStepKey =
  | "courses"
  | "goal"
  | "campaign"
  | "schedule"
  | "firstQuest";

export type OnboardingStepStatus = "completed" | "current" | "pending";

export type DashboardSnapshot = {
  courseCount: number;
  goalCount: number;
  milestoneCount: number;
  taskCount: number;
  scheduleBlockCount: number;
  todayQuestCount: number;
  completedQuestCount: number;
  firstGoalId?: string;
};

export type DashboardAction = {
  title: string;
  buttonLabel: string;
  href: string;
  step: OnboardingStepKey;
};

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  status: OnboardingStepStatus;
};

const stepLabels: Record<OnboardingStepKey, string> = {
  courses: "导入课表",
  goal: "创建 Boss",
  campaign: "生成战役",
  schedule: "生成本周副本",
  firstQuest: "完成第一个今日副本"
};

export function getDashboardAction(snapshot: DashboardSnapshot): DashboardAction {
  if (snapshot.courseCount === 0) {
    return {
      title: "先让恐龙侠侦察你的课表地图",
      buttonLabel: "导入课表",
      href: "/courses",
      step: "courses"
    };
  }

  if (snapshot.goalCount === 0) {
    return {
      title: "课表地图已就绪，创建第一个 Boss 吧",
      buttonLabel: "创建 Boss",
      href: "/goals/new",
      step: "goal"
    };
  }

  if (snapshot.milestoneCount === 0 || snapshot.taskCount === 0) {
    return {
      title: "Boss 已出现，生成战役吧",
      buttonLabel: "去生成战役",
      href: goalHref(snapshot),
      step: "campaign"
    };
  }

  if (snapshot.scheduleBlockCount === 0) {
    return {
      title: "战役已拆好，生成本周副本吧",
      buttonLabel: "生成本周副本",
      href: goalHref(snapshot),
      step: "schedule"
    };
  }

  if (snapshot.todayQuestCount > 0) {
    return {
      title: "今日副本已准备好",
      buttonLabel: "开始今日副本",
      href: "/battle/today",
      step: "firstQuest"
    };
  }

  return {
    title: "本周战斗路线已生成",
    buttonLabel: "查看本周路线",
    href: "/schedule",
    step: "firstQuest"
  };
}

export function getOnboardingSteps(snapshot: DashboardSnapshot): OnboardingStep[] {
  const completed: Record<OnboardingStepKey, boolean> = {
    courses: snapshot.courseCount > 0,
    goal: snapshot.goalCount > 0,
    campaign: snapshot.milestoneCount > 0 && snapshot.taskCount > 0,
    schedule: snapshot.scheduleBlockCount > 0,
    firstQuest: snapshot.completedQuestCount > 0
  };
  const currentStep = getDashboardAction(snapshot).step;

  return (Object.keys(stepLabels) as OnboardingStepKey[]).map((key) => ({
    key,
    label: stepLabels[key],
    status: completed[key] ? "completed" : key === currentStep ? "current" : "pending"
  }));
}

function goalHref(snapshot: DashboardSnapshot): string {
  return snapshot.firstGoalId ? `/goals/${snapshot.firstGoalId}` : "/goals";
}
