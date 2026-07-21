import { redis } from "../../config/redis.config";

const DRIVER_LOCATION_KEY = "drivers_live_locations";
const DRIVER_HEARTBEAT_PREFIX = "driver_heartbeat:";

export const startGeoCleanupJob = () => {
  setInterval(async () => {
    try {
      const driverIds = await redis.zrange(DRIVER_LOCATION_KEY, 0, -1);

      for (const driverId of driverIds) {
        const isOnline = await redis.exists(
          `${DRIVER_HEARTBEAT_PREFIX}${driverId}`
        );

        if (!isOnline) {
          await redis.zrem(DRIVER_LOCATION_KEY, driverId);

          console.log(`Removed offline driver: ${driverId}`);
        }
      }
    } catch (err) {
      console.error("Geo cleanup failed:", err);
    }
  }, 30000); // every 30 sec
};
