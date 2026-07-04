import { redis } from "../../config/redis.config.js";
import { TRIP_REDIS_KEYS } from "../../modules/trip/constants/trip.redis.keys.js";

const DRIVER_HEARTBEAT_PREFIX = TRIP_REDIS_KEYS.DRIVER_HEARTBEAT;
const HEARTBEAT_TTL = 30;
const DRIVER_LOCATION_KEY = TRIP_REDIS_KEYS.DRIVER_LOCATION;

export const geoService = {
  async updateDriverLocation({ driverId, longitude, latitude }) {
    // save geo location
    await redis.geoadd(DRIVER_LOCATION_KEY, longitude, latitude, driverId);

    // heartbeat key jnjgr
    await redis.set(
      `${DRIVER_HEARTBEAT_PREFIX}${driverId}`,
      "online",
      "EX",
      HEARTBEAT_TTL
    );
  },

  async getNearbyDrivers({ longitude, latitude, radiusKm }) {
    return redis.geosearch(
      DRIVER_LOCATION_KEY,
      "FROMLONLAT",
      longitude,
      latitude,
      "BYRADIUS",
      radiusKm,
      "km"
    );
  },

  async isDriverOnline(driverId) {
    const exists = await redis.exists(`${DRIVER_HEARTBEAT_PREFIX}${driverId}`);
    return exists === 1;
  },

  async removeDriver(driverId) {
    await redis.zrem(DRIVER_LOCATION_KEY, driverId);

    await redis.del(`${DRIVER_HEARTBEAT_PREFIX}${driverId}`);
  },
};
