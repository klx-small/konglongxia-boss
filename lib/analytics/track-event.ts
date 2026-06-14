import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AnalyticsEntityType =
  | "course"
  | "goal"
  | "task"
  | "schedule"
  | "battle"
  | "demo"
  | "feedback"
  | "ai";

export type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

export type TrackEventInput = {
  userId: string;
  eventName: string;
  entityType?: AnalyticsEntityType;
  entityId?: string;
  metadata?: AnalyticsMetadata;
};

export type AnalyticsEventStore = {
  create: (event: {
    userId: string;
    eventName: string;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) => Promise<unknown>;
};

const sensitiveMetadataKeys = ["key", "token", "secret", "prompt", "context", "password"];

export async function trackEvent(input: TrackEventInput & { store?: AnalyticsEventStore }): Promise<boolean> {
  const { store, ...event } = input;

  if (process.env.NODE_ENV === "test" && !store) {
    return true;
  }

  try {
    await (store ?? prismaAnalyticsEventStore).create({
      userId: event.userId,
      eventName: event.eventName,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: sanitizeMetadata(event.metadata)
    });

    return true;
  } catch {
    return false;
  }
}

export const prismaAnalyticsEventStore: AnalyticsEventStore = {
  create(event) {
    return prisma.analyticsEvent.create({
      data: {
        userId: event.userId,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata
      }
    });
  }
};

function sanitizeMetadata(metadata: AnalyticsMetadata | undefined): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || isSensitiveKey(key)) {
      continue;
    }

    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();

  return sensitiveMetadataKeys.some((sensitiveKey) => normalized.includes(sensitiveKey));
}
