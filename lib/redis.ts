import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient, type RedisClientType } from "redis";

type RedisAdapter = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
};

declare global {
  // Reuse a connected adapter across hot reloads and serverless invocations.
  var __movieTrackerRedisAdapter: RedisAdapter | undefined;
}

function readRestConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function readRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  return redisUrl;
}

function createUpstashAdapter(config: { url: string; token: string }): RedisAdapter {
  const client = new UpstashRedis(config);

  return {
    async get<T>(key: string) {
      return client.get<T>(key);
    },
    async set(key: string, value: unknown) {
      return client.set(key, value);
    },
  };
}

function createNodeRedisAdapter(redisUrl: string): RedisAdapter {
  const client: RedisClientType = createClient({
    url: redisUrl,
  });

  let connectionPromise: Promise<RedisClientType> | null = null;

  async function ensureConnected() {
    if (client.isOpen) {
      return client;
    }

    if (!connectionPromise) {
      connectionPromise = client.connect().then(() => client);
    }

    return connectionPromise;
  }

  return {
    async get<T>(key: string) {
      const connectedClient = await ensureConnected();
      const value = await connectedClient.get(key);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    },
    async set(key: string, value: unknown) {
      const connectedClient = await ensureConnected();
      const serializedValue =
        typeof value === "string" ? value : JSON.stringify(value);

      return connectedClient.set(key, serializedValue);
    },
  };
}

function createRedisAdapter() {
  const restConfig = readRestConfig();
  if (restConfig) {
    return createUpstashAdapter(restConfig);
  }

  const redisUrl = readRedisUrl();
  if (redisUrl) {
    return createNodeRedisAdapter(redisUrl);
  }

  throw new Error(
    "Missing required Redis environment variables. Set KV_REST_API_URL/KV_REST_API_TOKEN, UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN, or REDIS_URL.",
  );
}

function getRedisAdapter() {
  if (!globalThis.__movieTrackerRedisAdapter) {
    globalThis.__movieTrackerRedisAdapter = createRedisAdapter();
  }

  return globalThis.__movieTrackerRedisAdapter;
}

export const redis: RedisAdapter = {
  async get<T>(key: string) {
    return getRedisAdapter().get<T>(key);
  },
  async set(key: string, value: unknown) {
    return getRedisAdapter().set(key, value);
  },
};
