# Mock 模式内测部署说明

本说明用于第一轮小范围内测。当前阶段不配置 DeepSeek，不调用真实 DeepSeek API，战役生成使用本地 mock 模板。

## 推荐部署架构

- 代码托管：GitHub
- 数据库：Supabase PostgreSQL
- Web 部署：Vercel
- AI 模式：mock

## Supabase 数据库

1. 在 Supabase 创建新项目。
2. 获取 PostgreSQL 连接地址。
3. 在 Vercel 环境变量中配置 `DATABASE_URL`。
4. 云端数据库初始化使用：

```bash
npx.cmd prisma migrate deploy
```

部署环境不要使用 `npx.cmd prisma migrate dev`。`migrate dev` 只用于本地开发。

## Vercel 环境变量

第一轮内测建议设置：

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

还需要配置：

```env
DATABASE_URL=你的 Supabase PostgreSQL 连接地址
```

不要把真实 `DATABASE_URL` 或 API Key 写入仓库、README、截图或日志。

## Vercel 构建

项目已配置：

```json
"postinstall": "prisma generate"
```

Vercel 安装依赖后会生成 Prisma Client。

推荐构建命令保持默认：

```bash
npm run build
```

## 部署后检查

部署完成后依次打开：

- `/api/health`
- `/internal/readiness`
- `/internal/test-plan`
- `/internal/analytics`

`/internal/readiness` 没有失败项后，再把 `/internal/test-plan` 发给第一批内测同学。

## 发给内测用户

第一轮内测入口：

```text
/internal/test-plan
```

建议让测试者按页面任务完成：

- 一键体验恐龙侠
- 查看今日副本
- 完成一个任务
- 测试补救副本
- 创建自己的 Boss
- 生成战役和本周副本
- 提交一条反馈

## DeepSeek 暂不启用

第一轮内测保持：

```env
ENABLE_DEEPSEEK=false
AI_PROVIDER=mock
DEEPSEEK_API_KEY=
```

这样即使没有 DeepSeek Key，也可以完成课程、Boss、战役、排程、今日副本、反馈和内测观察面板的完整流程。
