import Redis, { type RedisOptions } from "ioredis";
import { logger } from "@/src/lib/logger";
import { toErrorMessage } from "@/src/lib/utils";

export type RedisClient = Pick<Redis, "get" | "set" | "del" | "exists">;

const redisUrl = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_REST_URL;
let client: Redis | null = null;
let disabledReason: string | null = null;

function createRedisOptions(): RedisOptions {
  return {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 0,
  };
}

function initialize() {
  if (!redisUrl) {
    disabledReason = "Missing REDIS_URL";
    logger.info("Redis disabled", { reason: disabledReason });
    return;
  }

  client = new Redis(redisUrl, createRedisOptions());
  client.on("error", (error) => {
    logger.warn("Redis connection error", { error: toErrorMessage(error) });
  });
  client.on("connect", () => {
    logger.info("Redis connected");
  });
  client.on("close", () => {
    logger.warn("Redis connection closed");
  });

  void client.connect().catch((error) => {
    disabledReason = `Failed to connect: ${toErrorMessage(error)}`;
    logger.error("Redis initialization failed", { reason: disabledReason });
    client = null;
  });
}

initialize();

export function getRedisClient(): RedisClient | null {
  return client;
}

export function getRedisStatus(): { enabled: boolean; reason?: string } {
  if (client) {
    return { enabled: true };
  }
  return { enabled: false, reason: disabledReason ?? "not initialized" };
}
