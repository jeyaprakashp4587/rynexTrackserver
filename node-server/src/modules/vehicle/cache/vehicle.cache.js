import { redisService } from "../../../Redis/redis.service.js";
import { redis } from "../../../config/redis.config.js";
import { vehicleCacheKeys } from "./cacheKeys.js";
import { driverCacheKeys } from "../../driver/cache/cacheKeys.js";

export const vehicleCache = {
  async getById(vehicleId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      vehicleCacheKeys.VEHICLE.BY_ID(vehicleId),
      fetcher,
      ttl
    );
  },

  async getCompanyVehicles(ownerId, fetcher, ttl = 3600) {
    return redisService.getOrSet(
      vehicleCacheKeys.VEHICLE.COMPANY_VEHICLES(ownerId),
      fetcher,
      ttl
    );
  },

  async getNearbyVehicleDrivers({
    latitude,
    longitude,
    radiusKm = 20,
    vehicleType,
  }) {
    const key = vehicleCacheKeys.GEO.VEHICLES(vehicleType);

    const vehicles = await redis.geosearch(
      key,
      "FROMLONLAT",
      longitude,
      latitude,
      "BYRADIUS",
      radiusKm,
      "km",
      "WITHDIST",
      "WITHCOORD"
    );

    return members.map(([id, distance, coords]) => ({
      driverId: id,
      distanceKm: Number(distance),
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
    }));
  },

  async invalidateCompanyVehicles(ownerId) {
    await redisService.del(vehicleCacheKeys.VEHICLE.COMPANY_VEHICLES(ownerId));
  },
};
