import { CacheClient } from "../src/types";

export class CacheMock implements CacheClient {
  public get(key: string): Promise<string | null> {
    return Promise.resolve(null);
  }
  public set(key: string, value: string, ttl?: number): Promise<void> {
    return Promise.resolve();
  }
  public del(key: string): Promise<void> {
    return Promise.resolve();
  }
}
