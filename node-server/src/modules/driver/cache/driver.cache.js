import { redisService } from "../../../Redis/redis.service.js";
import { redisCacheKeys } from "../../../Redis/cacheKeys.js";

export const driverCache = {
  async getById(driverId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.DRIVER.BY_ID(driverId),
      fetcher,
      ttl
    );
  },

  async getByUserId(driverUserId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.DRIVER.BY_USER_ID(driverUserId),
      fetcher,
      ttl
    );
  },

  async getLocation(driverId, fetcher, ttl = 120) {
    return redisService.getOrSet(
      redisCacheKeys.DRIVER.LOCATION(driverId),
      fetcher,
      ttl
    );
  },

  async setLocation(driverId, value, ttl = 120) {
    return redisService.set(
      redisCacheKeys.DRIVER.LOCATION(driverId),
      value,
      ttl
    );
  },

  async invalidateById(driverId) {
    await redisService.del(redisCacheKeys.DRIVER.BY_ID(driverId));
    await redisService.del(redisCacheKeys.DRIVER.LOCATION(driverId));
    await redisService.del(redisCacheKeys.DRIVER.HEARTBEAT(driverId));
  },
};
