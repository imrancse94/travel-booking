import Redis from 'ioredis';

// Thin wrapper around `ioredis`. Application code depends on this class,
// never on `ioredis` directly, so the cache/lock backend can be swapped later.
export class RedisClient {
  constructor(url, options = {}) {
    this.raw = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      ...options,
    });
  }

  on(event, handler) {
    this.raw.on(event, handler);
    return this;
  }

  async ping() {
    return this.raw.ping();
  }

  async get(key) {
    return this.raw.get(key);
  }

  async set(key, value, ...args) {
    return this.raw.set(key, value, ...args);
  }

  async del(key) {
    return this.raw.del(key);
  }

  async setEx(key, seconds, value) {
    return this.raw.set(key, value, 'EX', seconds);
  }

  disconnect() {
    return this.raw.disconnect();
  }
}
