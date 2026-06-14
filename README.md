# 恐龙侠打BOSS

面向中文大学生的 AI 课表排程 + 打怪式学习计划工具。

用户导入课表后，系统识别不可移动的课程时间；用户输入考试、作业、论文、考证等目标后，AI 将目标转化为一个可战斗的 Boss，并拆解为阶段任务和每日副本。系统会根据课表空闲时间自动排程。用户完成每日副本后，恐龙侠攻击 Boss 并获得 XP；任务未完成时，系统自动重排，Boss 轻微回血；每天生成战斗结算，帮助用户持续推进学习目标。

## 核心功能

- 课表导入与识别：支持用户导入课程表图片、表格或手动录入课程时间。
- 学习目标管理：支持考试、作业、论文、考证、竞赛等目标创建。
- AI Boss 拆解：将学习目标拆成阶段任务、每日副本、预计时长和完成标准。
- 自动排程：基于课程时间、截止日期、任务优先级和用户空闲时间生成学习计划。
- 今日副本：聚合当天应该完成的学习任务，方便移动端快速执行。
- 打怪式反馈：完成任务后恐龙侠攻击 Boss，获得 XP、等级和连续学习奖励。
- 自动重排：任务逾期或未完成时，根据剩余时间重新安排，Boss 少量回血。
- 每日结算：生成当天完成情况、伤害、XP、连续天数和明日建议。

## 技术栈

- 前端：Next.js + TypeScript + Tailwind CSS
- 移动端体验：移动端优先的响应式 Web App，后续可扩展为 PWA
- 后端：Next.js Route Handlers 或独立 Node.js API 服务
- 数据库：PostgreSQL
- ORM：Prisma
- AI 能力：服务端调用 DeepSeek Provider，本地默认使用 mock，前端不得保存或暴露 API Key
- 单元测试：Vitest
- 端到端测试：Playwright
- 时间处理：数据库统一保存 UTC，前端按用户 timezone 展示

## 本地开发步骤

1. 安装依赖：`npm.cmd install`
2. 复制 `.env.example` 为 `.env`，并按本地 PostgreSQL 配置 `DATABASE_URL`
3. 启动 PostgreSQL
4. 同步数据库：`npx.cmd prisma migrate dev`
5. 准备内测数据：`npm.cmd run db:seed`
6. 启动开发服务：`npm.cmd run dev`
7. 打开 `http://127.0.0.1:3000`

本地开发默认 `AI_PROVIDER=mock`，不要把真实 API Key 写入仓库。

## 启动内测版

1. 确认 PostgreSQL 已启动，并且 `.env` 中的 `DATABASE_URL` 可连接。
2. 运行 `npx.cmd prisma migrate dev` 同步数据库。
3. 运行 `npm.cmd run db:seed` 准备一套可体验的内测数据。
4. 运行 `npm.cmd run dev` 启动应用。
5. 打开 `http://127.0.0.1:3000`，从首页的“下一步行动中心”开始体验。

如果你想从空白数据开始验证真实新用户流程，可以运行 `npm.cmd run db:reset`，然后在首页点击“一键体验恐龙侠”。

内测前建议固定执行：

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
npm.cmd run e2e
```

## Mock 模式部署到 Vercel

第一轮内测不配置 DeepSeek 也可以部署。推荐使用：

- GitHub 托管代码
- Supabase PostgreSQL 提供云端数据库
- Vercel 部署 Next.js 应用
- `AI_PROVIDER=mock`
- `ENABLE_DEEPSEEK=false`

Vercel 环境变量至少配置：

```env
APP_ENV=staging
ENABLE_INTERNAL_PAGES=true
ENABLE_DEMO_SETUP=true
ENABLE_ANALYTICS=true
ENABLE_FEEDBACK=true
ENABLE_DEEPSEEK=false

AI_PROVIDER=mock
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
FEEDBACK_URL=
```

同时配置 Supabase 提供的 `DATABASE_URL`。不要把真实数据库地址或 API Key 写入仓库。

云端数据库迁移使用：

```bash
npx.cmd prisma migrate deploy
```

部署环境不要使用 `npx.cmd prisma migrate dev`。

部署后先打开 `/api/health` 和 `/internal/readiness`。确认没有失败项后，再把 `/internal/test-plan` 发给第一轮内测同学。

详细步骤见 [docs/DEPLOY_MOCK_STAGING.md](docs/DEPLOY_MOCK_STAGING.md)。

## 一键 Demo

首页提供“一键体验恐龙侠”按钮，用于给没有任何课程、Boss、战役和排程数据的内测用户快速创建示例流程。

Demo 会创建：

- 示例课程：高等数学、大学英语、计算机基础
- 示例 Boss：30 天通过英语四级
- mock 战役阶段和任务
- 未来 7 天本周副本

如果用户已经有战役数据，Demo 不会覆盖已有数据，会提示“你已经有战役数据了，无需重复创建 Demo。”。

## DeepSeek 配置

本地开发默认使用 mock：

```env
AI_PROVIDER="mock"
```

使用 DeepSeek 官方 API：

```env
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="你的 DeepSeek Key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

使用代理：

```env
AI_PROVIDER="proxy"
DEEPSEEK_API_KEY="代理 Key"
DEEPSEEK_BASE_URL="代理 Base URL"
DEEPSEEK_MODEL="代理支持的模型名"
```

DeepSeek 缺少 Key、接口失败、返回非法 JSON 或字段校验失败时，会自动 fallback 到本地 mock 模板生成战役。

## 反馈入口配置

在 `.env` 中配置：

```env
FEEDBACK_URL="https://example.com/feedback"
```

未配置 `FEEDBACK_URL` 时会使用内置反馈页：

- 打开 `/feedback`
- 选择反馈类型
- 填写反馈内容
- 可选填写当前页面、联系方式和评分

提交成功后会显示：“收到啦，恐龙侠会认真看你的反馈。”。

## 内测指标和排错

开发环境可以打开：

- `/debug`：查看数据库状态、AI Provider、DeepSeek Key 是否配置、事件数、AI 来源统计、Onboarding 漏斗和最近战斗日志
- `/internal/checklist`：查看内测检查清单，包括数据库、Health API、课程、Boss、战役、本周副本、今日副本、反馈能力、AnalyticsEvent、AI 配置
- `/internal/readiness`：查看真实内测部署检查，包括 DATABASE_URL 状态、数据库连接、mock 用户、AI Provider、反馈入口、埋点、Demo 数据和 internal 开关
- `/api/internal/metrics`：返回内测基础统计 JSON
- `/internal/analytics`：查看内测观察面板，包括核心漏斗、AI 稳定性、补救机制、每日事件趋势、最近反馈和最近事件流
- `/api/internal/analytics`：返回内测观察面板 JSON，支持 `days` 和 `eventName` 查询参数
- `/api/internal/deployment-readiness`：返回真实内测部署检查 JSON，不返回数据库密码或 API Key

生产环境默认不开放 internal 能力。如果确实要在内测部署环境打开，可配置：

```env
ENABLE_INTERNAL_PAGES="true"
```

一键 Demo 在生产环境默认关闭。如需内测部署环境开启，可配置：

```env
ENABLE_DEMO_SETUP="true"
```

埋点使用数据库自建 `AnalyticsEvent`，不会接第三方 SDK。metadata 只记录必要字段，例如 `source`、`status`、`count`、`durationMs`、`blockCount`，不记录 API Key、完整 prompt 或真实隐私内容。

## 内测观察建议

第一轮内测建议：

- 人数：5-10 人，优先找真实有课表和 DDL 的中文大学生。
- 单人测试时长：15-20 分钟。
- 部署前检查：打开 `/internal/readiness`，确认没有失败项；提醒项可以记录下来，不一定阻塞首轮内测。
- 任务清单地址：打开 `/internal/test-plan`，按“第一轮内测任务清单”引导同学完成体验。
- 反馈导出：在 `/internal/analytics` 点击“导出反馈 CSV”，或访问 `/api/internal/feedback/export`。
- 异常事件：在 `/internal/analytics` 查看“内测异常提醒”，重点关注 AI fallback、DeepSeek 失败、missed 过多、Bug 反馈和未排入任务。

小范围内测时优先看这些指标：

- Onboarding 漏斗：确认用户是否能从课表进入 Boss、战役、本周副本、今日副本和完成任务。
- `fallbackRate`：DeepSeek 调用后进入本地模板兜底的比例。比例高说明 API 稳定性、JSON 格式或 schema 校验需要优先排查。
- `rescueUsageRate`：错过任务后生成补救副本的比例。比例低可能说明用户没有发现补救入口，或补救体验不够明确。
- 用户漏斗表：按用户查看课表、Boss、战役、本周副本、今日副本、完成任务和反馈是否完成，优先定位卡住的人。
- 今日对比昨日：看事件数、完成任务数和反馈数是否有变化，判断内测是否持续推进。
- 最近反馈：看用户在哪个页面困惑、喜欢什么、希望补什么功能。
- 每日事件趋势：观察内测当天是否真的有人完成主链路，而不是只打开页面。

内测后可以按数据迭代：

- 漏斗掉点集中在哪一步，就优先优化该页面的引导和默认状态。
- `fallbackRate` 高时，先看 DeepSeek Key、网络、模型返回 JSON 和字段校验。
- `rescueUsageRate` 低但 missed 高时，增强今日副本和结算页的补救提示。
- 用户漏斗表里多数人停在同一步时，先优化该步骤的文案、默认数据和按钮位置。
- Bug 反馈出现时，先导出 CSV 聚合同类问题，再决定是否暂停下一批内测。
- 反馈中高频出现的页面名和关键词，优先进入下一轮产品打磨。

## 内测前检查清单

- 已运行 `npm.cmd run test`
- 已运行 `npm.cmd run lint`
- 已运行 `npm.cmd run build`
- 已运行 `npm.cmd run e2e`
- `/api/health` 返回数据库正常
- `/internal/readiness` 没有失败项
- `/debug` 显示数据库已连接、AI Provider 正确、DeepSeek Key 状态正确、内测事件数正常
- `/internal/checklist` 显示内测检查项
- `/internal/analytics` 显示内测观察面板
- `/internal/test-plan` 可以作为发给第一批内测同学的任务清单
- 首页“一键体验恐龙侠”可以创建 Demo 或正确提示已有数据
- `/feedback` 可以提交反馈
- 手机宽度下 `/battle/today`、`/schedule`、`/courses`、`/goals` 不横向溢出
- `.env` 和真实 API Key 没有提交到仓库

## 常用命令

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
npm.cmd run db:seed
npm.cmd run db:reset
npm.cmd run e2e
npm.cmd run e2e:ui
```

如果第一次运行 E2E 时提示缺少浏览器，请执行：

```bash
npx.cmd playwright install
```

## 项目原则

- 所有面向用户的 UI 文案使用中文。
- 课程时间不可移动，只能围绕课程空闲时间安排学习任务。
- 排程算法必须具备单元测试。
- AI 输出必须是结构化 JSON，并在服务端校验。
- 所有时间持久化为 UTC，前端根据用户 timezone 显示。
- OpenAI API Key 只能存放在服务端环境变量中，不能写入前端代码。
