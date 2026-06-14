export function formatDatabaseError(error: unknown, fallbackMessage: string): string {
  const message = collectErrorMessages(error).join("\n");
  const code = getErrorCode(error);

  if (message.startsWith("数据库连接失败") || message.startsWith("数据库尚未初始化")) {
    return message;
  }

  if (code === "P1001" || message.includes("Can't reach database server")) {
    return "数据库连接失败：请确认 PostgreSQL 已启动，并检查 DATABASE_URL。";
  }

  if (
    code === "P2021" ||
    code === "P2022" ||
    message.includes("does not exist") ||
    message.includes("relation") && message.includes("does not exist")
  ) {
    return "数据库尚未初始化：请先运行 npm.cmd run prisma:migrate。";
  }

  return process.env.NODE_ENV === "production"
    ? fallbackMessage
    : `${fallbackMessage}${message ? `：${message}` : ""}`;
}

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    return String(error.code);
  }

  return "";
}

function collectErrorMessages(error: unknown): string[] {
  if (error instanceof Error) {
    const messages = [error.message];
    const cause = "cause" in error ? error.cause : undefined;

    if (cause) {
      messages.push(...collectErrorMessages(cause));
    }

    return messages.filter(Boolean);
  }

  if (typeof error === "object" && error) {
    return Object.values(error)
      .flatMap((value) => collectErrorMessages(value))
      .filter(Boolean);
  }

  return typeof error === "string" ? [error] : [];
}
