import { redisService } from "../../../Redis/redis.service.js";
import { redisCacheKeys } from "../../../Redis/cacheKeys.js";

export const vehicleCache = {
  async getById(vehicleId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.VEHICLE.BY_ID(vehicleId),
      fetcher,
      ttl
    );
  },

  async getCompanyVehicles(ownerId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      redisCacheKeys.VEHICLE.COMPANY_VEHICLES(ownerId),
      fetcher,
      ttl
    );
  },

  async getNearby({ lat, lon, radiusKm, vehicleType }, fetcher, ttl = 300) {
    return redisService.getOrSet(
      redisCacheKeys.VEHICLE.NEARBY({ lat, lon, radiusKm, vehicleType }),
      fetcher,
      ttl
    );
  },

  async invalidateCompanyVehicles(ownerId) {
    await redisService.del(redisCacheKeys.VEHICLE.COMPANY_VEHICLES(ownerId));
  },
};
