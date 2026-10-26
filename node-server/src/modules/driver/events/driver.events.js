import { TOPICS } from "../../../kafka/kafka.config.js";
import {
  DRIVER_AVAILABILITY,
  DRIVER_TRIP_STATUS,
} from "../constants/driver.constants.js";
import {
  changeAvailabilityStatus as updateDriverAvailabilityStatus,
  changeTripStatus as updateDriverTripStatus,
} from "../services/driver.service.js";

export const TOPIC_DRIVER_UPDATED = TOPICS.DRIVER;

export const buildDriverUpdated = (driver) => ({
  event: "DRIVER_UPDATED",
  data: driver,
  timestamp: new Date().toISOString(),
});

export const handleDriverEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Driver Kafka event received:", parsed);

  if (parsed?.event !== "TRIP_ACCEPTED") {
    return parsed;
  }

  const { driverId } = parsed.data || {};

  if (!driverId) {
    return parsed;
  }

  await updateDriverAvailabilityStatus({
    driverId,
    newAvailabilityStatus: DRIVER_AVAILABILITY.UNAVAILABLE,
  });

  await updateDriverTripStatus({
    driverId,
    newTripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
  });

  return parsed;
};

export default {
  handleDriverEvent,
  buildDriverUpdated,
};
