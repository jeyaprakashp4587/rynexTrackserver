import { redis } from "../config/redis.config.js";
import { redisCacheKeys } from "./cacheKeys.js";

export const driverGeoService = {
  async updateDriverLocation(driverId, { latitude, longitude }) {
    if (!driverId || latitude == null || longitude == null) {
      return null;
    }

    const key = redisCacheKeys.GEO.DRIVER_LOCATIONS;

    await redis.geoadd(key, longitude, latitude, String(driverId));
    await redis.set(
      redisCacheKeys.DRIVER.LOCATION(driverId),
      JSON.stringify({ latitude, longitude }),
      "EX",
      120
    );

    return { latitude, longitude };
  },

  async getDriverLocation(driverId) {
    const cached = await redis.get(redisCacheKeys.DRIVER.LOCATION(driverId));
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await redis.geopos(
      redisCacheKeys.GEO.DRIVER_LOCATIONS,
      String(driverId)
    );

    if (!result || !result[0] || !result[0][0] || !result[0][1]) {
      return null;
    }

    const [longitude, latitude] = result[0];
    const location = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    await redis.set(
      redisCacheKeys.DRIVER.LOCATION(driverId),
      JSON.stringify(location),
      "EX",
      120
    );

    return location;
  },

  async getNearbyDrivers({ latitude, longitude, radiusKm = 20 }) {
    const members = await redis.georadius(
      redisCacheKeys.GEO.DRIVER_LOCATIONS,
      longitude,
      latitude,
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

  async setHeartbeat(driverId) {
    await redis.set(
      redisCacheKeys.DRIVER.HEARTBEAT(driverId),
      Date.now().toString(),
      "EX",
      180
    );
    return true;
  },

  async cleanupExpiredDrivers() {
    const heartbeats = await redis.keys("driver:heartbeat:*");
    const now = Date.now();

    for (const key of heartbeats) {
      const val = Number(await redis.get(key));
      if (!val || now - val > 180000) {
        const driverId = key.replace("driver:heartbeat:", "");
        await redis.zrem(redisCacheKeys.GEO.DRIVER_LOCATIONS, String(driverId));
        await redis.del(key);
        await redis.del(redisCacheKeys.DRIVER.LOCATION(driverId));
      }
    }

    return true;
  },
};
