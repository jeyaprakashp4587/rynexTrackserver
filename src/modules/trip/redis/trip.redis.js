import { redis } from "../../../config/redis.config.js";

export const saveDriverLocation = async ({ driverId, longitude, latitude }) => {
  await redis.geoadd("drivers_live_locations", longitude, latitude, driverId);
};
