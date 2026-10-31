import * as tripRepo from "../../repositories/generic/trip.repositories.js";
import {
  TERMINAL_STOP_STATUSES,
  TRIP_MODE,
  TRIP_REQUEST_TYPE,
  TRIP_STATUS,
  TRIP_STOP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { TRIP_ERRORS, TRIP_RESPONSES } from "../../constants/generic/trip.messages.js";
import {
  buildTripAcceptedData,
  buildTripAssignedData,
  buildTripFulfilledData,
} from "../../events/trip.events.js";
import * as tripPublisher from "../../events/trip.publisher.js";
import { buildTripAssignment } from "../../utils/generic/buildTripAssignment.js";
import { claimCandidate } from "../../utils/generic/claimCandidate.js";
import { findRecipientByUserId } from "../../utils/generic/findRecipient.js";
import { formatRecipients } from "../../utils/shared/formatRecipients.js";
import { formatTripStop } from "../../utils/shared/formatTripStop.js";
import { normalizeRecipients } from "../../utils/generic/normalizeRecipients.js";
import { newObjectId, toObjectId } from "../../utils/shared/objectId.js";
import { requireTripId, requireUserId } from "../../utils/shared/requireIds.js";
import { parseStopProgress } from "../../utils/shared/parseStopProgress.js";
import { parseVehiclesRequired } from "../../utils/generic/parseVehiclesRequired.js";

export const createTripRequest = async ({ body, userId, requestType }) => {
  const data = body?.data;

  if (!data) {
    throw new Error(TRIP_ERRORS.TRIP_DATA_REQUIRED);
  }

  const { tripMode, bookingType, recipients, stops } = data;

  if (!Array.isArray(stops) || stops.length === 0) {
    throw new Error(TRIP_ERRORS.STOP_REQUIRED);
  }

  const creatorId = requireUserId(userId);
  const candidates = normalizeRecipients(recipients, creatorId);
  const vehiclesRequired = parseVehiclesRequired(
    data.vehiclesRequired,
    candidates.length
  );

  const normalizedRequestType = (
    requestType ||
    body?.requestType ||
    TRIP_REQUEST_TYPE.USER
  ).toUpperCase();

  const initialStatus =
    normalizedRequestType === TRIP_REQUEST_TYPE.OWNER
      ? TRIP_STATUS.WAITING_FOR_DRIVER
      : TRIP_STATUS.PENDING;

  const tripRequestId = newObjectId();

  await tripRepo.createTripStopRecords({
    tripRequestId,
    stops: formatTripStop(stops),
  });

  const tripRequest = await tripRepo.createTripRequestRecord({
    _id: tripRequestId,
    createdBy: [creatorId],
    tripType: bookingType,
    tripStopMode: tripMode,
    recipients: candidates,
    vehiclesRequired,
    status: initialStatus,
  });

  await tripPublisher.publishTripCreated(tripRequest);

  return tripRequest;
};

export const listTripRequests = async (userId) => {
  return tripRepo.listTripRequestsByUser(requireUserId(userId));
};

export const getTripRequestDetails = async (tripId, userId) => {
  const trip = await tripRepo.getTripRequestDetailById(
    requireTripId(tripId),
    requireUserId(userId)
  );

  return trip[0];
};

export const acceptTripRequestForOwner = async ({
  body,
  userId,
  tripId: routeTripId,
}) => {
  const tripId = requireTripId(body?.tripId || routeTripId);
  const ownerId = requireUserId(userId);

  const tripRequest = await tripRepo.findTripRequestById({ tripId });

  if (!tripRequest) {
    throw new Error(TRIP_ERRORS.REQUEST_NOT_FOUND);
  }

  const ownerEntry = tripRequest.recipients.find(
    (recipient) =>
      recipient.userId.equals(ownerId) &&
      recipient.status === TRIP_STATUS.PENDING
  );

  if (!ownerEntry) {
    throw new Error(TRIP_ERRORS.NOT_ALLOWED_TO_ASSIGN);
  }

  const assignments = normalizeRecipients(body?.recipients, ownerId);

  const takenUserIds = new Set(
    tripRequest.recipients
      .filter((recipient) => !recipient._id.equals(ownerEntry._id))
      .map((recipient) => recipient.userId.toString())
  );

  if (assignments.some(({ userId: id }) => takenUserIds.has(id.toString()))) {
    throw new Error(TRIP_ERRORS.RECIPIENT_ALREADY_ON_REQUEST);
  }

  const updated = await tripRepo.assignDriversToRequest({
    tripRequestId: tripId,
    ownerUserId: ownerId,
    recipients: assignments,
  });

  if (!updated) {
    return { message: TRIP_RESPONSES.ASSIGNMENT_FAILED };
  }

  await tripPublisher.publishTripAssigned(
    buildTripAssignedData({
      tripRequestId: tripId,
      assignedBy: ownerId,
      assignments,
    })
  );

  return { message: TRIP_RESPONSES.ASSIGNED, trip: updated };
};

export const acceptTripRequestForDriver = async ({ userId, tripId }) => {
  const requestId = requireTripId(tripId);
  const driverUserId = requireUserId(userId);

  const tripRequest = await tripRepo.findTripRequestById({ tripId: requestId });

  if (!tripRequest) {
    throw new Error(TRIP_ERRORS.REQUEST_NOT_FOUND);
  }

  const { request, candidate, claimedNow } = await claimCandidate({
    tripRequest,
    requestId,
    driverUserId,
  });

  const trip = await tripRepo.upsertTripForRequest({
    tripRequestId: requestId,
    createdBy: request.createdBy?.[0],
    tripStopMode: request.tripStopMode,
  });

  const assignment = buildTripAssignment(candidate, driverUserId);

  await tripRepo.addRecipientToTripRecord({
    tripId: trip._id,
    recipientData: assignment,
  });

  const recipientId = await tripRepo.findRecipientIdForTripAndUser(
    trip._id,
    driverUserId
  );

  await tripRepo.linkTripStopsToRecipient({
    tripRequestId: requestId,
    tripId: trip._id,
    recipientId,
  });

  await tripPublisher.publishTripAccepted(
    buildTripAcceptedData({
      trip,
      tripRequestId: requestId,
      assignment,
      recipientId,
    })
  );

  if (claimedNow && request.status === TRIP_STATUS.ACCEPTED) {
    await tripPublisher.publishTripFulfilled(
      buildTripFulfilledData({ tripRequest: request, tripId: trip._id })
    );
  }

  return { message: TRIP_RESPONSES.ACCEPTED, trip };
};

export const rejectTripRequestForDriver = async ({ userId, tripId }) => {
  const driverUserId = requireUserId(userId);

  const updated = await tripRepo.rejectRecipient({
    tripRequestId: requireTripId(tripId),
    userId: driverUserId,
  });

  if (!updated) {
    throw new Error(TRIP_ERRORS.REJECT_UNAVAILABLE);
  }

  await tripPublisher.publishTripRejected({
    tripRequestId: updated._id,
    userId: driverUserId,
    status: updated.status,
  });

  return { message: TRIP_RESPONSES.REJECTED, trip: updated };
};

export const getDriverCurrentTripDetails = async (userId) => {
  const trip = await tripRepo.findAcceptedTripByRecipientUser(userId);

  if (!trip?.length) {
    throw new Error(TRIP_ERRORS.NO_ACTIVE_TRIP);
  }

  const [tripStop] = await tripRepo.findTripStopsByRecipient(
    trip[0]._id,
    trip[0].users[0].recipientId
  );

  return { trip, tripStop };
};

export const updateTripStopProgress = async ({ body, userId }) => {
  const { tripId, stopSequence, status, proofPhotos } =
    parseStopProgress(body);

  const recipientId = await tripRepo.findRecipientIdForTripAndUser(
    tripId,
    requireUserId(userId),
    { status: TRIP_STATUS.ACCEPTED, activeOnly: true }
  );

  if (!recipientId) {
    throw new Error(TRIP_ERRORS.TRIP_NOT_FOUND);
  }

  const result = await tripRepo.updateRecipientStopStatus({
    tripId,
    stopSequence,
    recipientId,
    status,
    proofPhotos,
  });

  if (!result.matchedCount) {
    throw new Error(TRIP_ERRORS.STOP_NOT_FOUND);
  }

  if (TERMINAL_STOP_STATUSES.includes(status)) {
    await tripRepo.advanceRecipientStopIndex({
      tripId,
      recipientId,
      stopSequence,
    });
  }

  await tripPublisher.publishTripStopUpdated({
    tripId,
    recipientId,
    stopSequence,
    status,
  });

  return { message: TRIP_RESPONSES.STOP_UPDATED };
};
