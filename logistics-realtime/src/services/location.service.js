import { createMainClient } from "../redis/clients/main.client.js";
import { logger } from "../utils/logger.js";
import heartbeatService from "../redis/heartbeat/driver-heartbeat.service.js";

const GEO_KEY = "drivers:live:locations";

const updateDriverLocation = async ({
  driverId,
  tripId,
  latitude,
  longitude,
  timestamp,
}) => {
  const client = await createMainClient();
  try {
    // GEOADD expects longitude first
    await client.geoAdd(GEO_KEY, { longitude, latitude, member: driverId });
    // refresh heartbeat
    await heartbeatService.touchHeartbeat(driverId);
    logger.info("location:update", `driver ${driverId} location updated`, {
      driverId,
      tripId,
      latitude,
      longitude,
    });
  } catch (err) {
    logger.error("location:update:error", err.message);
    throw err;
  }
};

const getDriverLocation = async (driverId) => {
  const client = await createMainClient();
  const res = await client.geoPos(GEO_KEY, driverId);
  return res && res[0]
    ? { longitude: res[0].longitude, latitude: res[0].latitude }
    : null;
};

export default { updateDriverLocation, getDriverLocation };
