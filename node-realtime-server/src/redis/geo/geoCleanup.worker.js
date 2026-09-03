import { createMainClient } from "../clients/main.client.js";
import { driverLocationService } from "./driver-location.service.js";
import { logger } from "../../utils/logger.js";

const DRIVER_LOCATION_KEY = "drivers:live:locations";
const DRIVER_HEARTBEAT_PREFIX = "driver:heartbeat:";

export const startGeoCleanupJob = (intervalMs = 30000) => {
  setInterval(async () => {
    try {
      const client = await createMainClient();
      const driverIds = await client.zrange(DRIVER_LOCATION_KEY, 0, -1);

      for (const driverId of driverIds) {
        const isOnline = await client.exists(
          `${DRIVER_HEARTBEAT_PREFIX}${driverId}`
        );

        if (!isOnline) {
          await client.zrem(DRIVER_LOCATION_KEY, driverId);
          logger.info("geo:cleanup", `Removed offline driver: ${driverId}`);
        }
      }
    } catch (err) {
      logger.error("geo:cleanup:error", err.message);
    }
  }, intervalMs);
};

export default startGeoCleanupJob;
