import { createMainClient } from "../clients/main.client.js";
import env from "../../../config/env.js";
import { logger } from "../../utils/logger.js";

const DRIVER_LOCATION_KEY = "drivers:live:locations";
const DRIVER_HEARTBEAT_PREFIX = "driver:heartbeat:";
const HEARTBEAT_TTL = env.HEARTBEAT_TTL || 30;

export const driverLocationService = {
  async updateDriverLocation({ driverId, longitude, latitude }) {
    const client = await createMainClient();
    // GEOADD longitude latitude member
    await client.sendCommand([
      "GEOADD",
      DRIVER_LOCATION_KEY,
      String(longitude),
      String(latitude),
      driverId,
    ]);

    await client.set(`${DRIVER_HEARTBEAT_PREFIX}${driverId}`, "online", {
      EX: HEARTBEAT_TTL,
    });

    logger.info("geo:update", `updated driver ${driverId}`);
  },

  async getNearbyDrivers({ longitude, latitude, radiusKm = 5 }) {
    const client = await createMainClient();
    // Use GEORADIUS via sendCommand for broad compatibility
    const res = await client.sendCommand([
      "GEORADIUS",
      DRIVER_LOCATION_KEY,
      String(longitude),
      String(latitude),
      String(radiusKm),
      "km",
    ]);
    return res || [];
  },

  async isDriverOnline(driverId) {
    const client = await createMainClient();
    const exists = await client.exists(`${DRIVER_HEARTBEAT_PREFIX}${driverId}`);
    return exists === 1;
  },

  async removeDriver(driverId) {
    const client = await createMainClient();
    await client.zrem(DRIVER_LOCATION_KEY, driverId);
    await client.del(`${DRIVER_HEARTBEAT_PREFIX}${driverId}`);
    logger.info("geo:remove", `removed driver ${driverId}`);
  },
};

export default driverLocationService;
