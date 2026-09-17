import { redisService } from "../../../Redis/redis.service.js";
import { redisCacheKeys } from "../../../Redis/cacheKeys.js";

export const companyCache = {
  async getById(companyId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.COMPANY.BY_ID(companyId),
      fetcher,
      ttl
    );
  },

  async getByOwner(ownerId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.COMPANY.BY_OWNER(ownerId),
      fetcher,
      ttl
    );
  },

  async getDriversByOwner(ownerId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.COMPANY.DRIVERS_BY_OWNER(ownerId),
      fetcher,
      ttl
    );
  },

  async getVehiclesByOwner(ownerId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.COMPANY.VEHICLES_BY_OWNER(ownerId),
      fetcher,
      ttl
    );
  },

  async invalidateByOwner(ownerId) {
    await redisService.del(redisCacheKeys.COMPANY.BY_OWNER(ownerId));
    await redisService.del(redisCacheKeys.COMPANY.DRIVERS_BY_OWNER(ownerId));
    await redisService.del(redisCacheKeys.COMPANY.VEHICLES_BY_OWNER(ownerId));
  },
};
