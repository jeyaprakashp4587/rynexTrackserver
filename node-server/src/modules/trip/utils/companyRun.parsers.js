import {
  COMPANY_RUN,
  TRIP_STOP_TYPE,
} from "../constants/trip.constants.js";
import { COMPANY_ERRORS } from "../constants/company.messages.js";
import { TRIP_ERRORS } from "../constants/trip.messages.js";
import { formatTripStop } from "./formatTripStop.js";
import { toObjectId, toOptionalObjectId } from "./objectId.js";

const STOP_TYPES = Object.values(TRIP_STOP_TYPE);

const parseOptionalText = (value, maxLength, errorMessage) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new Error(errorMessage);
  }

  return trimmed || undefined;
};

export const parseStartRun = ({ params, body }) => {
  const runId = parseOptionalText(
    body?.runId,
    COMPANY_RUN.MAX_RUN_ID_LENGTH,
    COMPANY_ERRORS.INVALID_RUN_ID
  );

  if (runId && !COMPANY_RUN.RUN_ID_PATTERN.test(runId)) {
    throw new Error(COMPANY_ERRORS.INVALID_RUN_ID);
  }

  return {
    routeId: toObjectId(params?.routeId, COMPANY_ERRORS.INVALID_ROUTE_ID),
    vehicleId: toObjectId(body?.vehicleId, TRIP_ERRORS.INVALID_VEHICLE_ID),
    runId,
  };
};

export const parseEndRun = (body) => ({
  reason: parseOptionalText(
    body?.reason,
    COMPANY_RUN.MAX_END_REASON_LENGTH,
    COMPANY_ERRORS.INVALID_END_REASON
  ),
});

export const parseHandover = (body) => ({
  driverUserId: toObjectId(
    body?.driverUserId,
    COMPANY_ERRORS.INVALID_HANDOVER_TARGET
  ),
  driverId: toOptionalObjectId(body?.driverId, TRIP_ERRORS.INVALID_DRIVER_ID),
});

export const parseExtraStops = (body) => {
  const stops = body?.stops;

  if (!Array.isArray(stops) || stops.length === 0) {
    throw new Error(COMPANY_ERRORS.EXTRA_STOPS_REQUIRED);
  }

  if (stops.length > COMPANY_RUN.MAX_EXTRA_STOPS) {
    throw new Error(COMPANY_ERRORS.EXTRA_STOPS_LIMIT);
  }

  if (!stops.every((stop) => STOP_TYPES.includes(stop?.stopType))) {
    throw new Error(COMPANY_ERRORS.INVALID_STOP_TYPE);
  }

  return formatTripStop(stops);
};
