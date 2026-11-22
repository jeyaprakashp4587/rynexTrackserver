import { TOPICS } from "../../../kafka/kafka.config.js";
import {
  DRIVER_AVAILABILITY,
  DRIVER_TRIP_STATUS,
} from "../constants/driver.constants.js";
import {
  changeAvailabilityStatus as updateDriverAvailabilityStatus,
  changeTripStatus as updateDriverTripStatus,
  updateDriverActiveTrip,
} from "../services/driver.service.js";
import { TRIP_TYPE } from "../../trip/constants/shared/trip.constants.js";

export const TOPIC_DRIVER_UPDATED = TOPICS.DRIVER;

export const buildDriverUpdated = (driver) => ({
  event: "DRIVER_UPDATED",
  data: driver,
  timestamp: new Date().toISOString(),
});

export const handleDriverEvent = async (payload) => {
  let parsed;

  if (typeof payload?.value === "string") {
    try {
      parsed = JSON.parse(payload.value);
    } catch (error) {
      console.warn("Invalid Kafka JSON payload:", payload.value);
      return payload;
    }
  } else {
    parsed = payload?.value || payload;
  }

  console.log("Driver Kafka event received:", parsed);

  const activeTripEvents = new Set([
    "TRIP_ACCEPTED",
    "TRIP_STARTED",
    "TRIP_HANDOVER",
    "COMPANY_TRIP_STARTED",
  ]);
  const endedTripEvents = new Set([
    "TRIP_ENDED",
    "TRIP_CANCELLED",
    "TRIP_REJECTED",
    "TRIP_EXPIRED",
  ]);

  if (
    !activeTripEvents.has(parsed?.event) &&
    !endedTripEvents.has(parsed?.event)
  ) {
    return parsed;
  }

  const data = parsed.data || {};
  const { driverId, driverUserId, userId, toDriverUserId, activeDriverUserId } =
    data;
  const lookup = driverId
    ? { driverId }
    : {
        userId: toDriverUserId ?? driverUserId ?? activeDriverUserId ?? userId,
      };

  if (!lookup.driverId && !lookup.userId) {
    console.warn("Driver event ignored: no driverId or userId", parsed);
    return parsed;
  }

  if (activeTripEvents.has(parsed.event)) {
    const activeTripId = data.tripId || data._id || data.runId || null;
    const isCompany = Boolean(
      data.companyRouteId ||
        parsed.event === "COMPANY_TRIP_STARTED" ||
        data.tripType === TRIP_TYPE.COMPANY
    );
    const activeTripType =
      data.tripType || (isCompany ? TRIP_TYPE.COMPANY : TRIP_TYPE.INDEPENDENT);

    await updateDriverActiveTrip({
      ...lookup,
      activeTripId,
      activeTripType,
      newAvailabilityStatus: DRIVER_AVAILABILITY.UNAVAILABLE,
      newTripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
    });
  } else {
    await updateDriverActiveTrip({
      ...lookup,
      activeTripId: null,
      activeTripType: null,
      newAvailabilityStatus: DRIVER_AVAILABILITY.AVAILABLE,
      newTripStatus: DRIVER_TRIP_STATUS.IDLE,
    });
  }

  return parsed;
};

export default {
  handleDriverEvent,
  buildDriverUpdated,
};
