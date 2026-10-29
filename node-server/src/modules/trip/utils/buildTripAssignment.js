import { TRIP_STATUS } from "../constants/trip.constants.js";
import { newObjectId } from "./objectId.js";

export const buildTripAssignment = (candidate, userId) => ({
  _id: newObjectId(),
  userId,
  driverId: candidate.driverId,
  driverUserId: candidate.driverUserId,
  vehicleId: candidate.vehicleId,
  assignedBy: candidate.assignedBy,
  assignedAt: candidate.assignedAt || new Date(),
  acceptedAt: candidate.acceptedAt || new Date(),
  status: TRIP_STATUS.ACCEPTED,
});
