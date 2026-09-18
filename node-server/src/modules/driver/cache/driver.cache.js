import { redisService } from "../../../Redis/redis.service.js";
import { driverCacheKeys } from "./cacheKeys.js";

export const driverCache = {
  async getById(driverId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      driverCacheKeys.DRIVER.BY_ID(driverId),
      fetcher,
      ttl
    );
  },

  async getByUserId(driverUserId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      driverCacheKeys.DRIVER.BY_USER_ID(driverUserId),
      fetcher,
      ttl
    );
  },

  async getLocation(driverId, fetcher, ttl = 120) {
    return redisService.getOrSet(
      driverCacheKeys.DRIVER.LOCATION(driverId),
      fetcher,
      ttl
    );
  },
};
