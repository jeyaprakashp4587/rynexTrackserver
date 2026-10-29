import { TRIP_STATUS } from "../constants/trip.constants.js";
import { TRIP_ERRORS } from "../constants/trip.messages.js";
import { toObjectId, toOptionalObjectId } from "./objectId.js";

const OPTIONAL_ID_FIELDS = [
  ["driverId", TRIP_ERRORS.INVALID_DRIVER_ID],
  ["driverUserId", TRIP_ERRORS.INVALID_DRIVER_USER_ID],
  ["vehicleId", TRIP_ERRORS.INVALID_VEHICLE_ID],
];

export const normalizeRecipients = (recipients, assignedBy) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error(TRIP_ERRORS.RECIPIENT_REQUIRED);
  }

  const assignedById = toObjectId(assignedBy, TRIP_ERRORS.INVALID_ASSIGNED_BY);
  const seen = new Set();

  return recipients.map((recipient) => {
    const userId = toObjectId(
      recipient?.userId,
      TRIP_ERRORS.INVALID_RECIPIENT_USER_ID
    );

    if (seen.has(userId.toString())) {
      throw new Error(TRIP_ERRORS.DUPLICATE_RECIPIENT);
    }
    seen.add(userId.toString());

    const normalized = {
      userId,
      assignedBy: assignedById,
      status: TRIP_STATUS.PENDING,
      assignedAt: new Date(),
    };

    for (const [field, errorMessage] of OPTIONAL_ID_FIELDS) {
      const value = toOptionalObjectId(recipient[field], errorMessage);

      if (value) {
        normalized[field] = value;
      }
    }

    return normalized;
  });
};
