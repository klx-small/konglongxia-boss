# PRD：恐龙侠打BOSS

## 1. 产品概述

“恐龙侠打BOSS”是面向中文大学生的 AI 课表排程 + 打怪式学习计划工具。产品将考试、作业、论文、考证等学习目标转化为 Boss，再拆解为阶段任务和每日副本。系统根据用户课表空闲时间自动排程，并通过恐龙侠攻击 Boss、获得 XP、每日结算等反馈，帮助用户把长期目标推进到每天可执行的行动。

## 2. 目标用户

- 中文大学生，本科生和研究生均可。
- 有固定课表，但课外时间碎片化。
- 经常面对考试、作业、论文、考证、竞赛等多个并行目标。
- 知道自己需要学习，但难以拆解目标、安排时间和持续执行。

## 3. 用户痛点

- 课表和学习计划割裂：课程时间固定，但任务安排常常没有避开课程。
- 长期目标压力大：考试、论文、考证看起来像一个巨大目标，不知道从哪里开始。
- DDL 驱动严重：临近截止日期才集中赶工，容易熬夜和焦虑。
- 计划维护成本高：一旦当天没完成任务，后续计划就需要手动重排。
- 正反馈不足：传统待办列表只显示未完成事项，缺少持续推进感。
- 移动端使用不顺：很多计划工具偏桌面，不适合学生在课间、路上快速查看。

## 4. 核心闭环

1. 用户导入或手动录入课表。
2. 系统识别课程时间，并将课程作为不可移动时间块。
3. 用户输入学习目标，例如“高数期末 3 周后考试”或“下周五提交论文初稿”。
4. AI 将目标转化为 Boss，并拆解为阶段任务和每日副本。
5. 系统根据课表空闲时间、截止日期、任务时长和优先级自动排程。
6. 用户每天打开首页，查看今日副本并完成任务。
7. 完成任务后，恐龙侠攻击 Boss，用户获得 XP。
8. 未完成任务会进入自动重排，Boss 轻微回血。
9. 每天生成战斗结算，展示完成情况、伤害、XP、连续天数和明日建议。

## 5. MVP 功能范围

### 5.1 包含功能

- 用户基础设置：昵称、学校可选、timezone。
- 课表模块：手动录入课程；为后续图片或表格识别预留接口。
- 课程展示：按周视图和今日视图展示课程时间。
- 目标创建：用户输入目标名称、类型、截止日期、重要程度、补充说明。
- AI 拆解：服务端调用 AI，将目标生成 Boss、阶段任务和每日副本建议。
- JSON 校验：AI 输出必须通过结构化 schema 校验。
- Boss 管理：展示 Boss 名称、血量、截止日期、阶段进度。
- 自动排程：根据课表空闲时间安排每日副本。
- 今日副本：展示当天任务、预计时长、完成按钮。
- 游戏化反馈：完成任务造成伤害、获得 XP、更新 Boss 血量。
- 未完成重排：未完成任务自动进入后续空闲时间，Boss 少量回血。
- 每日结算：展示当天完成任务、造成伤害、获得 XP、Boss 状态变化。

### 5.2 暂不包含功能

- 多人组队打 Boss。
- 校园教务系统自动登录抓取课表。
- 复杂社交系统、排行榜、公会。
- 完整成就系统和商城系统。
- 原生 App。
- 多语言 UI。

## 6. 页面结构

### 6.1 首页 / 今日副本

- 今日课程概览。
- 今日副本列表。
- 当前主 Boss 状态。
- 完成任务入口。
- 今日战斗结算入口。

### 6.2 课表页

- 周课表视图。
- 今日课程列表。
- 新增、编辑、删除课程。
- 课程时间冲突提示。

### 6.3 Boss 目标页

- Boss 列表。
- Boss 血量、阶段、截止日期、风险状态。
- 创建新目标入口。
- 查看 Boss 详情。

### 6.4 Boss 详情页

- Boss 基本信息。
- 阶段任务列表。
- 每日副本计划。
- 任务完成记录。
- 重新排程入口。

### 6.5 创建目标页

- 目标名称。
- 目标类型：考试、作业、论文、考证、竞赛、其他。
- 截止日期。
- 重要程度。
- 用户补充说明。
- AI 拆解确认页。

### 6.6 战斗结算页

- 今日完成任务数。
- 今日造成伤害。
- 今日获得 XP。
- Boss 血量变化。
- 连续学习天数。
- 明日建议。

### 6.7 设置页

- 昵称。
- timezone。
- 每日可学习时间偏好。
- 提醒偏好。

## 7. 数据模型

### 7.1 User

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 用户 ID |
| nickname | string | 用户昵称 |
| timezone | string | 用户 timezone，例如 `Asia/Shanghai` |
| xp | number | 累计 XP |
| level | number | 当前等级 |
| createdAtUtc | datetime | 创建时间 |
| updatedAtUtc | datetime | 更新时间 |

### 7.2 Course

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 课程 ID |
| userId | string | 用户 ID |
| name | string | 课程名称 |
| location | string | 上课地点 |
| weekday | number | 周几，1-7 |
| startAtUtc | datetime | 当前学期内某次课程开始时间，按 UTC 保存 |
| endAtUtc | datetime | 当前学期内某次课程结束时间，按 UTC 保存 |
| recurrenceRule | string | 重复规则 |
| source | string | 来源：手动、图片识别、表格导入 |
| createdAtUtc | datetime | 创建时间 |
| updatedAtUtc | datetime | 更新时间 |

### 7.3 BossGoal

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | Boss ID |
| userId | string | 用户 ID |
| title | string | 学习目标名称 |
| type | string | 考试、作业、论文、考证、竞赛、其他 |
| bossName | string | Boss 名称 |
| description | string | 目标说明 |
| deadlineAtUtc | datetime | 截止时间 |
| totalHp | number | 总血量 |
| currentHp | number | 当前血量 |
| priority | number | 重要程度，1-5 |
| status | string | 计划中、战斗中、已击败、已逾期 |
| aiPlanJson | json | AI 结构化拆解结果 |
| createdAtUtc | datetime | 创建时间 |
| updatedAtUtc | datetime | 更新时间 |

### 7.4 StageTask

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 阶段任务 ID |
| bossGoalId | string | Boss ID |
| title | string | 阶段任务标题 |
| description | string | 阶段任务说明 |
| orderIndex | number | 阶段顺序 |
| estimatedMinutes | number | 预计总时长 |
| status | string | 未开始、进行中、已完成 |
| createdAtUtc | datetime | 创建时间 |
| updatedAtUtc | datetime | 更新时间 |

### 7.5 DailyQuest

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 每日副本 ID |
| bossGoalId | string | Boss ID |
| stageTaskId | string | 阶段任务 ID |
| title | string | 副本标题 |
| description | string | 副本说明 |
| scheduledStartAtUtc | datetime | 计划开始时间 |
| scheduledEndAtUtc | datetime | 计划结束时间 |
| estimatedMinutes | number | 预计时长 |
| damage | number | 完成后造成伤害 |
| xpReward | number | 完成后获得 XP |
| status | string | 待开始、进行中、已完成、未完成、已重排 |
| completedAtUtc | datetime | 完成时间 |
| createdAtUtc | datetime | 创建时间 |
| updatedAtUtc | datetime | 更新时间 |

### 7.6 BattleSettlement

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 结算 ID |
| userId | string | 用户 ID |
| date | string | 用户 timezone 下的自然日 |
| totalDamage | number | 当天总伤害 |
| totalXp | number | 当天总 XP |
| completedQuestCount | number | 完成副本数 |
| missedQuestCount | number | 未完成副本数 |
| bossHpRecovered | number | Boss 回血量 |
| summary | string | 中文结算文案 |
| createdAtUtc | datetime | 创建时间 |

## 8. API 设计

所有 API 时间字段默认使用 UTC。需要展示为本地时间时，由前端根据用户 timezone 转换。

### 8.1 用户设置

- `GET /api/me`：获取当前用户信息。
- `PATCH /api/me`：更新昵称、timezone、学习偏好。

### 8.2 课表

- `GET /api/courses`：获取课程列表。
- `POST /api/courses`：新增课程。
- `PATCH /api/courses/:id`：编辑课程。
- `DELETE /api/courses/:id`：删除课程。
- `POST /api/courses/import`：导入课表，MVP 可先返回待确认的课程草稿。

### 8.3 Boss 目标

- `GET /api/boss-goals`：获取 Boss 列表。
- `POST /api/boss-goals`：创建学习目标并触发 AI 拆解。
- `GET /api/boss-goals/:id`：获取 Boss 详情。
- `PATCH /api/boss-goals/:id`：更新 Boss 基础信息。
- `POST /api/boss-goals/:id/regenerate-plan`：重新生成 AI 拆解方案。

### 8.4 AI 拆解

- `POST /api/ai/decompose-goal`：服务端调用 AI，将目标拆为 Boss、阶段任务和每日副本建议。

AI 输出 JSON 示例：

```json
{
  "boss": {
    "name": "高数期末巨龙",
    "totalHp": 1200,
    "riskLevel": "medium"
  },
  "stages": [
    {
      "title": "梳理知识点",
      "estimatedMinutes": 240,
      "quests": [
        {
          "title": "复习极限与连续",
          "estimatedMinutes": 60,
          "damage": 80,
          "xpReward": 40
        }
      ]
    }
  ],
  "warnings": [
    "距离考试时间较近，建议优先安排高频考点。"
  ]
}
```

### 8.5 排程

- `POST /api/schedule/generate`：根据课程、Boss 任务和用户偏好生成排程。
- `POST /api/schedule/replan`：对未完成任务进行自动重排。
- `GET /api/schedule/today`：获取今日课程和今日副本。

### 8.6 今日副本

- `GET /api/daily-quests/today`：获取今日副本列表。
- `PATCH /api/daily-quests/:id/start`：标记副本开始。
- `PATCH /api/daily-quests/:id/complete`：完成副本，触发伤害和 XP 更新。
- `PATCH /api/daily-quests/:id/miss`：标记未完成，进入重排。

### 8.7 战斗结算

- `GET /api/battle-settlements/today`：获取今日结算。
- `POST /api/battle-settlements/generate`：生成当天战斗结算。

## 9. 游戏化规则

### 9.1 Boss 血量

- Boss 总血量由目标难度、截止时间、预计任务总时长共同决定。
- 简单目标建议 300-600 HP。
- 中等目标建议 600-1500 HP。
- 复杂目标建议 1500-3000 HP。

### 9.2 伤害

- 每个每日副本有固定伤害值。
- 伤害可根据任务时长、难度、截止紧急程度计算。
- 完成任务后立即扣除 Boss 当前血量。
- Boss 血量降至 0 时，目标状态变为“已击败”。

### 9.3 XP

- 完成副本获得 XP。
- XP 主要奖励持续行动，不应只奖励高难任务。
- 连续完成每日副本可获得少量连续奖励。

### 9.4 未完成和回血

- 未完成任务不会直接失败，而是进入自动重排。
- Boss 轻微回血，建议为未完成副本伤害值的 10%-20%。
- 回血上限不能超过 Boss 总血量。
- 连续多天未完成时，系统应优先降低当天计划量，而不是无限堆叠任务。

### 9.5 每日结算

- 每天按用户 timezone 的自然日生成结算。
- 结算内容包括完成副本数、未完成副本数、总伤害、总 XP、Boss 回血量和明日建议。
- 结算文案保持鼓励和具体，不使用羞辱式表达。

## 10. 成功指标

- 用户完成首次课表录入。
- 用户创建第一个 Boss 目标。
- AI 拆解结果被用户接受或轻量编辑后保存。
- 用户完成第一个今日副本。
- 用户连续 3 天查看今日副本或完成任务。
- 自动重排后，用户仍能理解今天要做什么。

