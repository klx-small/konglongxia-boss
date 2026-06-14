import { Client } from "pg";

import { loadLocalEnv } from "@/lib/load-env";

loadLocalEnv();

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/konglongxia_db?schema=public";

export async function assertDatabaseAvailable() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query("select 1");
  } catch {
    throw new Error("数据库连接失败：请确认 PostgreSQL 已启动，并检查 DATABASE_URL。");
  } finally {
    await client.end().catch(() => undefined);
  }
}
