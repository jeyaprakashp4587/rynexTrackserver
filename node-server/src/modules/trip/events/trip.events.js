import { TOPICS } from "../../../kafka/kafka.config.js";
import { LOG_MESSAGES, TRIP_EVENT_TYPES } from "../constants/trip.constants.js";

export const TOPIC_TRIP = TOPICS.TRIP;
export const TOPIC_TRIP_CREATED = TOPIC_TRIP;
export const TOPIC_TRIP_UPDATED = TOPIC_TRIP;
export const TOPIC_TRIP_ACCEPTED = TOPIC_TRIP;

const buildEvent = (event, data) => ({
  event,
  data,
  timestamp: new Date().toISOString(),
});

export const buildTripCreated = (trip) =>
  buildEvent(TRIP_EVENT_TYPES.CREATED, trip);

export const buildTripUpdated = (trip) =>
  buildEvent(TRIP_EVENT_TYPES.UPDATED, trip);

export const buildTripAccepted = (trip) =>
  buildEvent(TRIP_EVENT_TYPES.ACCEPTED, trip);

export const buildTripAssigned = (data) =>
  buildEvent(TRIP_EVENT_TYPES.ASSIGNED, data);

export const buildTripRejected = (data) =>
  buildEvent(TRIP_EVENT_TYPES.REJECTED, data);

export const buildTripFulfilled = (data) =>
  buildEvent(TRIP_EVENT_TYPES.FULFILLED, data);

export const buildTripStopUpdated = (data) =>
  buildEvent(TRIP_EVENT_TYPES.STOP_UPDATED, data);

export const buildTripStarted = (data) =>
  buildEvent(TRIP_EVENT_TYPES.STARTED, data);

export const buildTripHandover = (data) =>
  buildEvent(TRIP_EVENT_TYPES.HANDOVER, data);

export const buildTripStopsAdded = (data) =>
  buildEvent(TRIP_EVENT_TYPES.STOPS_ADDED, data);

export const buildTripEnded = (data) =>
  buildEvent(TRIP_EVENT_TYPES.ENDED, data);

export const buildRunStartedData = ({ trip, assignment }) => ({
  tripId: trip._id,
  companyRouteId: trip.companyRouteId,
  recipientId: assignment._id,
  driverUserId: assignment.userId,
  driverId: assignment.driverId,
  vehicleId: assignment.vehicleId,
  startedAt: trip.startedAt.toISOString(),
});

export const buildRunEndedData = ({ trip, reason }) => ({
  tripId: trip._id,
  companyRouteId: trip.companyRouteId,
  driverUserId: trip.activeDriverUserId,
  vehicleId: trip.activeVehicleId,
  status: trip.status,
  reason,
  completedAt: trip.completedAt?.toISOString(),
});

export const buildRunHandoverData = ({ trip, previous, assignment, actorId }) => ({
  tripId: trip._id,
  companyRouteId: trip.companyRouteId,
  vehicleId: assignment.vehicleId,
  fromDriverUserId: previous.userId,
  toDriverUserId: assignment.userId,
  recipientId: assignment._id,
  currentStopIndex: assignment.currentStopIndex,
  handedOverBy: actorId,
});

export const buildRunStopsAddedData = ({ trip, stops, actorId }) => ({
  tripId: trip._id,
  companyRouteId: trip.companyRouteId,
  addedBy: actorId,
  stops: stops.map(({ sequence, locationName, stopType }) => ({
    sequence,
    locationName,
    stopType,
  })),
});

export const buildTripAcceptedData = ({
  trip,
  tripRequestId,
  assignment,
  recipientId,
}) => ({
  tripId: trip._id,
  tripRequestId,
  driverId: assignment.driverId,
  vehicleId: assignment.vehicleId,
  recipientId,
  userId: assignment.userId,
  status: assignment.status,
  acceptedAt: assignment.acceptedAt.toISOString(),
});

export const buildTripAssignedData = ({ tripRequestId, assignedBy, assignments }) => ({
  tripRequestId,
  assignedBy,
  recipients: assignments.map(({ userId, driverId, driverUserId, vehicleId }) => ({
    userId,
    driverId,
    driverUserId,
    vehicleId,
  })),
});

export const buildTripFulfilledData = ({ tripRequest, tripId }) => ({
  tripRequestId: tripRequest._id,
  tripId,
  vehiclesRequired: tripRequest.vehiclesRequired,
  acceptedCount: tripRequest.acceptedCount,
});

export const handleTripEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log(LOG_MESSAGES.EVENT_RECEIVED, parsed);
  return parsed;
};

export default {
  handleTripEvent,
  buildTripCreated,
  buildTripUpdated,
  buildTripAccepted,
  buildTripAssigned,
  buildTripRejected,
  buildTripFulfilled,
  buildTripStopUpdated,
  buildTripStarted,
  buildTripHandover,
  buildTripStopsAdded,
  buildTripEnded,
};
