import { TOPICS } from "../../../kafka/kafka.config.js";
import {
  VEHICLE_AVAILABILITY,
  VEHICLE_TRIP_STATUS,
} from "../constants/vehicle.constants.js";
import {
  changeAvailabilityStatus as updateVehicleAvailabilityStatus,
  changeTripStatus as updateVehicleTripStatus,
} from "../services/vehicle.service.js";

export const TOPIC_VEHICLE_UPDATED = TOPICS.VEHICLE;

export const buildVehicleUpdated = (vehicle) => ({
  event: "VEHICLE_UPDATED",
  data: vehicle,
  timestamp: new Date().toISOString(),
});

export const handleVehicleEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Vehicle Kafka event received:", parsed);

  if (parsed?.event !== "TRIP_ACCEPTED") {
    return parsed;
  }

  const { vehicleId } = parsed.data || {};

  if (!vehicleId) {
    return parsed;
  }

  await updateVehicleAvailabilityStatus({
    vehicleId,
    newAvailabilityStatus: VEHICLE_AVAILABILITY.UNAVAILABLE,
  });

  await updateVehicleTripStatus({
    vehicleId,
    newTripStatus: VEHICLE_TRIP_STATUS.ON_TRIP,
  });

  return parsed;
};

export default {
  handleVehicleEvent,
  buildVehicleUpdated,
};
