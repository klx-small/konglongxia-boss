import { prisma } from "@/lib/prisma";
import { trackEvent, type TrackEventInput } from "@/lib/analytics/track-event";

export type FeedbackType = "bug" | "suggestion" | "confusing" | "like" | "other";

export type FeedbackInput = {
  type?: FeedbackType;
  page?: string;
  content?: string;
  contact?: string;
  rating?: number;
};

export type FeedbackRecord = {
  id: string;
  userId: string;
  type: FeedbackType;
  page: string | null;
  content: string;
  contact: string | null;
  rating: number | null;
  createdAt: Date;
};

export type FeedbackStore = {
  create: (data: {
    userId: string;
    type: FeedbackType;
    page?: string;
    content: string;
    contact?: string;
    rating?: number;
  }) => Promise<FeedbackRecord>;
};

const feedbackTypes: FeedbackType[] = ["bug", "suggestion", "confusing", "like", "other"];

export async function submitFeedback({
  store = prismaFeedbackStore,
  track = trackEvent,
  userId,
  input
}: {
  store?: FeedbackStore;
  track?: (event: TrackEventInput) => Promise<unknown>;
  userId: string;
  input: FeedbackInput;
}) {
  const payload = normalizeFeedbackInput(input);
  const feedback = await store.create({ userId, ...payload });

  try {
    await track({
      userId,
      eventName: "feedback_submitted",
      entityType: "feedback",
      entityId: feedback.id,
      metadata: {
        type: payload.type,
        page: payload.page || null,
        rating: payload.rating ?? null
      }
    });
  } catch {
    // 反馈提交是主流程，埋点失败不能影响用户提交。
  }

  return { feedback, message: "收到啦，恐龙侠会认真看你的反馈。" };
}

export const prismaFeedbackStore: FeedbackStore = {
  create(data) {
    return prisma.feedback.create({
      data: {
        userId: data.userId,
        type: data.type,
        page: data.page,
        content: data.content,
        contact: data.contact,
        rating: data.rating
      }
    });
  }
};

function normalizeFeedbackInput(input: FeedbackInput) {
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (!content) {
    throw new Error("反馈内容不能为空。");
  }

  if (content.length > 1000) {
    throw new Error("反馈内容不能超过 1000 字。");
  }

  const rating = normalizeRating(input.rating);

  return {
    type: normalizeType(input.type),
    page: normalizeOptionalString(input.page),
    content,
    contact: normalizeOptionalString(input.contact),
    ...(rating === undefined ? {} : { rating })
  };
}

function normalizeType(value: unknown): FeedbackType {
  return typeof value === "string" && feedbackTypes.includes(value as FeedbackType)
    ? (value as FeedbackType)
    : "other";
}

function normalizeRating(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("评分必须是 1-5。");
  }

  return rating;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined;
}
