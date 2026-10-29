import { TRIP_STATUS } from "../constants/trip.constants.js";

export const formatRecipients = (recipients, assignedBy) => {
  return recipients.map((recipient) => ({
    userId: recipient.userId,
    driverId: recipient.driverId,
    vehicleId: recipient.vehicleId,
    driverUserId: recipient.driverUserId,
    assignedBy,
    status: TRIP_STATUS.PENDING,
    assignedAt: new Date(),
  }));
};
