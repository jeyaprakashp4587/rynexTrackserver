import { TRIP_ERRORS } from "../../constants/generic/trip.messages.js";
import { toObjectId } from "./objectId.js";

export const requireUserId = (userId) =>
  toObjectId(userId, TRIP_ERRORS.INVALID_USER_ID);

export const requireTripId = (tripId) =>
  toObjectId(tripId, TRIP_ERRORS.INVALID_TRIP_ID);
