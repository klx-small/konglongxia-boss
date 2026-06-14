import OpenAI from "openai";

import { loadLocalEnv } from "@/lib/load-env";

loadLocalEnv();

export function createDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY，请先配置 DeepSeek API Key。");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
  });
}

export function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}
