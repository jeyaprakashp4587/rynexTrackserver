import { redis } from "../../../../config/redis.config.js";
import { LOG_MESSAGES } from "../../constants/shared/trip.constants.js";
import { driverLocationKeys, tripLocationKeys } from "./locationKeys.js";

const safeDelete = async (keys) => {
  try {
    await redis.del(...keys);
  } catch (error) {
    console.warn(LOG_MESSAGES.LOCATION_CLEAR_FAILED, error?.message || error);
  }
};

export const clearDriverLocation = (driverUserId) =>
  safeDelete(driverLocationKeys(driverUserId));

export const clearTripLocation = (target) =>
  safeDelete(tripLocationKeys(target));
