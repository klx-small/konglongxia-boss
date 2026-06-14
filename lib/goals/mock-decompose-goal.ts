import type { Goal, GoalIntensity } from "@/lib/types";

export type MilestoneStatus = "pending" | "active" | "completed";
export type TaskStatus = "pending" | "scheduled" | "completed" | "skipped" | "overdue";
export type TaskType =
  | "small_monster"
  | "elite_monster"
  | "daily_dungeon"
  | "boss_battle"
  | "rescue_dungeon";

export type DecomposedMilestone = {
  title: string;
  description: string;
  order: number;
  dueDate: string;
  status: MilestoneStatus;
};

export type DecomposedTask = {
  milestoneOrder: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: number;
  priority: number;
  deadline: string;
  taskType: TaskType;
  xpReward: number;
  status: TaskStatus;
};

export type DecomposedCampaign = {
  milestones: DecomposedMilestone[];
  tasks: DecomposedTask[];
};

type MilestoneTemplate = {
  title: string;
  description: string;
  taskSeeds: string[];
};

const taskCountByIntensity: Record<GoalIntensity, number> = {
  relaxed: 3,
  standard: 4,
  sprint: 5
};

const priorityBoostByIntensity: Record<GoalIntensity, number> = {
  relaxed: 0,
  standard: 1,
  sprint: 2
};

export function mockDecomposeGoal(goal: Goal): DecomposedCampaign {
  const templates = getMilestoneTemplates(goal).slice(0, getMilestoneCount(goal));
  const goalDeadline = parseDateOnly(goal.deadline);
  const milestoneStepDays = Math.max(1, Math.ceil(templates.length * 1.6));
  const milestones = templates.map((template, index): DecomposedMilestone => {
    const order = index + 1;
    const dueDate = addDays(goalDeadline, -Math.max(0, templates.length - order) * milestoneStepDays);

    return {
      title: template.title,
      description: template.description,
      order,
      dueDate: formatDateOnly(dueDate),
      status: order === 1 ? "active" : "pending"
    };
  });

  const tasks = templates.flatMap((template, milestoneIndex) =>
    buildTasksForMilestone(goal, template, milestoneIndex + 1, milestones[milestoneIndex].dueDate)
  );

  return { milestones, tasks };
}

function buildTasksForMilestone(
  goal: Goal,
  template: MilestoneTemplate,
  milestoneOrder: number,
  deadline: string
): DecomposedTask[] {
  const baseCount = taskCountByIntensity[goal.intensity];
  const isFinalMilestone = template.title.includes("Boss") || template.title.includes("真题");
  const taskCount = Math.min(8, baseCount + (isFinalMilestone ? 1 : 0));

  return Array.from({ length: taskCount }, (_, index): DecomposedTask => {
    const isBossBattle = isFinalMilestone && index === taskCount - 1;
    const isElite = !isBossBattle && (index + milestoneOrder) % 3 === 0;
    const taskType = getTaskType(isBossBattle, isElite, milestoneOrder, index);
    const difficulty = getDifficulty(taskType, goal.intensity, milestoneOrder);
    const estimatedMinutes = getEstimatedMinutes(taskType, goal.dailyAvailableMinutes, index);
    const priority = Math.min(5, Math.max(1, difficulty + priorityBoostByIntensity[goal.intensity]));

    return {
      milestoneOrder,
      title: buildTaskTitle(template, index),
      description: `完成「${template.title}」第 ${index + 1} 个挑战，为 ${goal.bossName} 战役推进进度。`,
      estimatedMinutes,
      difficulty,
      priority,
      deadline,
      taskType,
      xpReward: difficulty * 18 + Math.round(estimatedMinutes / 5) * 5,
      status: "pending"
    };
  });
}

function getMilestoneTemplates(goal: Goal): MilestoneTemplate[] {
  const title = goal.title;

  if (title.includes("四级") || title.includes("英语")) {
    return [
      milestone("词汇小怪清理", "先清理高频词和易错词，为后续副本铺路。", [
        "高频词速刷",
        "核心短语整理",
        "易错词复盘",
        "词汇小测"
      ]),
      milestone("听力副本训练", "用短听力和长对话训练稳定得分。", [
        "短篇新闻精听",
        "长对话定位",
        "听力错因复盘",
        "关键词影子跟读"
      ]),
      milestone("阅读精英怪突破", "拆解阅读题型，集中突破长难句和定位。", [
        "选词填空训练",
        "段落匹配训练",
        "仔细阅读训练",
        "长难句拆解"
      ]),
      milestone("写作翻译训练", "积累作文模板和翻译表达。", [
        "作文模板改写",
        "翻译句型训练",
        "范文复盘",
        "限时写作"
      ]),
      milestone("真题 Boss 战", "用整套真题模拟最终战。", [
        "整套真题限时",
        "错题归因",
        "薄弱项回炉",
        "考前清单"
      ])
    ];
  }

  if (title.includes("论文") || goal.goalType === "paper") {
    return [
      milestone("选题确认", "确定论文主题、问题意识和基本边界。", [
        "题目备选",
        "研究问题确认",
        "导师反馈整理",
        "题目定稿"
      ]),
      milestone("资料搜索", "收集核心文献和参考材料。", [
        "关键词检索",
        "核心文献下载",
        "资料卡片整理",
        "引用信息核对"
      ]),
      milestone("大纲搭建", "把论文结构拆成可写的小节。", [
        "一级标题搭建",
        "论点排序",
        "材料归位",
        "写作路线确认"
      ]),
      milestone("初稿写作", "完成可修改的完整初稿。", [
        "引言初稿",
        "主体段落写作",
        "结论初稿",
        "参考文献补齐"
      ]),
      milestone("修改查重", "完成语言修改、格式检查和查重准备。", [
        "通读修改",
        "格式检查",
        "查重风险处理",
        "终稿导出"
      ])
    ];
  }

  if (title.includes("高数") || title.includes("高等数学")) {
    return [
      milestone("概念地基修复", "补齐定义、定理和公式理解。", ["定义复盘", "公式默写", "典型例题", "概念小测"]),
      milestone("计算小怪清理", "集中练习基础计算题。", ["极限计算", "导数计算", "积分计算", "错题回炉"]),
      milestone("题型精英怪突破", "拆解高频综合题型。", ["题型归类", "综合题训练", "步骤复盘", "易错点标记"]),
      milestone("模拟 Boss 战", "用整套题检验复习成果。", ["限时模拟", "错题订正", "薄弱点回补", "考前清单"])
    ];
  }

  if (title.includes("期末") || goal.goalType === "exam") {
    return [
      milestone("范围侦察", "确认考试范围和重点章节。", ["范围整理", "重点标记", "资料归档", "复习日历"]),
      milestone("章节小怪清理", "逐章清理基础题和笔记。", ["章节笔记", "基础题训练", "错题整理", "知识点复述"]),
      milestone("重点精英怪突破", "集中突破高频考点。", ["重点题训练", "难点复盘", "方法总结", "错题回炉"]),
      milestone("真题 Boss 战", "完成真题或模拟卷训练。", ["限时真题", "卷面复盘", "查漏补缺", "考前清单"])
    ];
  }

  if (title.includes("计算机二级") || title.includes("考证") || goal.goalType === "certificate") {
    return [
      milestone("考纲侦察", "确认考试模块和得分规则。", ["考纲阅读", "题型整理", "工具配置", "备考计划"]),
      milestone("基础操作训练", "练习基础知识和操作题。", ["基础题刷练", "操作题分解", "快捷操作", "错题整理"]),
      milestone("套题精英怪突破", "按套题训练稳定得分。", ["套题训练", "错因复盘", "薄弱项补强", "时间控制"]),
      milestone("模拟 Boss 战", "完成考前模拟和最终检查。", ["全真模拟", "错题回炉", "考前清单", "状态调整"])
    ];
  }

  if (title.includes("作业") || goal.goalType === "homework") {
    return [
      milestone("题目拆解", "先读懂要求，拆出可完成的小块。", ["要求确认", "资料准备", "任务拆分", "风险标记"]),
      milestone("主体完成", "完成作业主体内容。", ["第一部分", "第二部分", "检查计算", "补齐说明"]),
      milestone("提交前 Boss 战", "检查格式、引用和提交材料。", ["格式检查", "查漏补缺", "最终核对", "提交准备"])
    ];
  }

  return [
    milestone("目标侦察", "明确目标范围和完成标准。", ["目标拆解", "资料准备", "时间估算", "风险标记"]),
    milestone("核心推进", "完成目标中最关键的主体任务。", ["核心任务一", "核心任务二", "反馈修正", "阶段复盘"]),
    milestone("收尾 Boss 战", "完成最终检查和提交准备。", ["查漏补缺", "成果整理", "最终检查", "提交准备"])
  ];
}

function milestone(title: string, description: string, taskSeeds: string[]): MilestoneTemplate {
  return { title, description, taskSeeds };
}

function getMilestoneCount(goal: Goal): number {
  if (goal.intensity === "relaxed") {
    return goal.goalType === "homework" ? 3 : 4;
  }

  return 5;
}

function getTaskType(
  isBossBattle: boolean,
  isElite: boolean,
  milestoneOrder: number,
  index: number
): TaskType {
  if (isBossBattle) {
    return "boss_battle";
  }

  if (isElite) {
    return "elite_monster";
  }

  if (milestoneOrder === 1 && index === 0) {
    return "rescue_dungeon";
  }

  return index % 2 === 0 ? "small_monster" : "daily_dungeon";
}

function getEstimatedMinutes(taskType: TaskType, dailyAvailableMinutes: number, index: number): number {
  const dailyCap = Math.max(25, dailyAvailableMinutes);

  if (taskType === "boss_battle") {
    return Math.min(Math.max(90, dailyCap), 120);
  }

  if (taskType === "elite_monster") {
    return Math.min(60, 45 + (index % 2) * 10);
  }

  return Math.min(45, 25 + (index % 3) * 10);
}

function getDifficulty(taskType: TaskType, intensity: GoalIntensity, milestoneOrder: number): number {
  const base = taskType === "boss_battle" ? 5 : taskType === "elite_monster" ? 4 : 2;
  const intensityBoost = intensity === "sprint" ? 1 : 0;

  return Math.min(5, base + intensityBoost + (milestoneOrder >= 4 ? 1 : 0));
}

function buildTaskTitle(template: MilestoneTemplate, index: number): string {
  return template.taskSeeds[index % template.taskSeeds.length];
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
