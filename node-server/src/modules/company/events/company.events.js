import {
  DRIVER_AVAILABILITY,
  DRIVER_TRIP_STATUS,
} from "../../driver/constants/driver.constants.js";
import {
  changeAvailabilityStatus as updateDriverAvailabilityStatus,
  changeTripStatus as updateDriverTripStatus,
  updateDriverActiveTrip,
} from "../../driver/services/driver.service.js";
import { TRIP_TYPE } from "../../trip/constants/shared/trip.constants.js";

export const TOPIC_COMPANY_UPDATED = "company.updated";

export const buildCompanyUpdated = (company) => ({
  event: "COMPANY_UPDATED",
  data: company,
  timestamp: new Date().toISOString(),
});

export const buildCompanyTripStarted = ({
  driverId,
  driverUserId,
  vehicleId,
  routeId,
  tripId,
}) => ({
  event: "COMPANY_TRIP_STARTED",
  data: {
    driverId,
    driverUserId,
    vehicleId,
    routeId,
    tripId,
  },
  timestamp: new Date().toISOString(),
});

export const handleCompanyEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Company Kafka event received:", parsed);

  if (parsed?.event !== "COMPANY_TRIP_STARTED") {
    return parsed;
  }

  const { driverId, driverUserId, tripId } = parsed.data || {};
  if (!driverId && !driverUserId) {
    return parsed;
  }

  const lookup = driverId ? { driverId } : { userId: driverUserId };

  await updateDriverActiveTrip({
    ...lookup,
    activeTripId: tripId || null,
    activeTripType: TRIP_TYPE.COMPANY,
    newAvailabilityStatus: DRIVER_AVAILABILITY.UNAVAILABLE,
    newTripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
  });

  return parsed;
};

export default {
  handleCompanyEvent,
  buildCompanyUpdated,
  buildCompanyTripStarted,
};
