
import { createClient, RedisClientType } from "redis";
import { CacheClient, Logger } from "../types";

export class CacheService implements CacheClient {
  private client!: RedisClientType;

  constructor(private readonly logger: Logger) {
    this.initCache();
    logger.log("info", `[Cache] Cache Service started `);
  }
  private async initCache() {
    this.logger.log("info", "Initializing Redis connection...");
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379");
    const redisUrl =
      process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;
    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            this.logger.log("info", `Redis reconnection attempt: ${retries}`);
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.client.on("error", (err) => {
        this.logger.error("Redis Client Error:", err);
      });

      this.client.on("connect", () => {
        this.logger.error("Redis client connected");
      });

      this.client.on("ready", () => {
        this.logger.error("Redis client ready");
      });

      // Connect to Redis
      await this.client.connect();

      this.logger.info("Successfully connected to Redis!");

      // Test the connection
      await this.client.ping();
      console.log("Redis ping successful!");
    } catch (error: any) {
      console.error("Redis connection failed:", error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.log("error", `[Cache] Redis get operation failed: ${error}`);
      throw new Error("Cache get operation failed");
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }

    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.log("error", `[Cache] Redis operation failed: ${error}`);
      throw new Error("Cache operation failed");
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.log(
        "error",
        `[Cache] Redis delete operation failed: ${error}`,
      );
      throw new Error("Cache delete operation failed");
    }
  }
}
