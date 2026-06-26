import { redis } from "../../config/redis.config.js";

export const redisService = {
  async set(key, value, ttl = null) {
    const data = JSON.stringify(value);

    if (ttl) {
      return redis.set(key, data, "EX", ttl);
    }

    return redis.set(key, data);
  },

  async get(key) {
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data);
  },

  async del(key) {
    return redis.del(key);
  },

  async exists(key) {
    return redis.exists(key);
  },

  async expire(key, ttl) {
    return redis.expire(key, ttl);
  },
};
