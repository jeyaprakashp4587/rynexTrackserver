import {
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import {
  COMPANY_RUN,
  STANDING_ASSIGNMENT_INACTIVE_STATUSES,
} from "../../constants/company/company.constants.js";

export const sameId = (a, b) =>
  Boolean(a) && Boolean(b) && a.toString() === b.toString();

export const standingDriverUserId = (standing) =>
  standing.driverUserId ?? standing.userId;

export const findStandingAssignment = (recipients = [], userId, vehicleId) =>
  recipients.find(
    (standing) =>
      !STANDING_ASSIGNMENT_INACTIVE_STATUSES.includes(standing.status) &&
      sameId(standingDriverUserId(standing), userId) &&
      (!vehicleId || sameId(standing.vehicleId, vehicleId))
  );

export const findActiveAssignment = (trip) =>
  (trip.recipients ?? []).find(
    (assignment) =>
      assignment.status === TRIP_STATUS.ACCEPTED &&
      sameId(assignment.userId, trip.activeDriverUserId)
  );

export const isTripOwner = (trip, userId) =>
  sameId(trip.createdBy, userId) ||
  (trip.recipients ?? []).some((assignment) =>
    sameId(assignment.assignedBy, userId)
  );

export const hasAssignment = (trip, userId) =>
  (trip.recipients ?? []).some((assignment) => sameId(assignment.userId, userId));

export const wasHandedOverTo = (trip, assignment) =>
  !sameId(trip.recipients?.[0]?._id, assignment._id);

export const hasHandedOver = (trip, userId) =>
  (trip.recipients ?? []).some(
    (assignment) =>
      sameId(assignment.userId, userId) &&
      assignment.cancelReason === COMPANY_RUN.HANDOVER_CANCEL_REASON
  );
