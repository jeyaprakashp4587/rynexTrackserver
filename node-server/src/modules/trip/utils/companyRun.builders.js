import {
  DEFAULT_STOP_INDEX,
  GEO_POINT_TYPE,
  TRIP_STATUS,
  TRIP_STOP_STATUS,
} from "../constants/trip.constants.js";
import { COMPANY_RESPONSES } from "../constants/company.messages.js";
import { findActiveAssignment, standingDriverUserId } from "./companyRoute.js";
import { newObjectId } from "./objectId.js";

const bySequence = (a, b) => a.sequence - b.sequence;

export const buildStopMeta = (recipientId) => ({
  recipientId,
  status: TRIP_STOP_STATUS.PENDING,
});

export const buildRunAssignment = ({ standing, now = new Date() }) => ({
  _id: newObjectId(),
  userId: standingDriverUserId(standing),
  driverId: standing.driverId,
  driverUserId: standingDriverUserId(standing),
  vehicleId: standing.vehicleId,
  assignedBy: standing.assignedBy,
  assignedAt: standing.assignedAt ?? now,
  acceptedAt: now,
  status: TRIP_STATUS.ACCEPTED,
  currentStopIndex: DEFAULT_STOP_INDEX,
});

export const buildRunTrip = ({ route, assignment, runId, now = new Date() }) => ({
  _id: newObjectId(),
  companyRouteId: route._id,
  runId,
  createdBy: route.createdBy,
  tripStopMode: route.tripStopMode,
  status: TRIP_STATUS.ACCEPTED,
  isTripEnded: false,
  startedAt: now,
  activeDriverUserId: assignment.userId,
  activeVehicleId: assignment.vehicleId,
  recipients: [assignment],
});

export const buildRunStops = (templateStops, recipientId) =>
  [...templateStops].sort(bySequence).map((stop) => {
    const [templateMeta = {}] = stop.recipientsMeta ?? [];
    const contactPerson = stop.contactPerson || templateMeta.contactPerson || "";
    const contactPhone = stop.contactPhone || templateMeta.contactPhone || "";

    return {
      sequence: stop.sequence,
      stopType: stop.stopType,
      locationName: stop.locationName,
      coords: {
        type: GEO_POINT_TYPE,
        coordinates: stop.coords.coordinates,
      },
      contactPerson,
      contactPhone,
      recipientsMeta: [
        {
          ...buildStopMeta(recipientId),
          contactPerson,
          contactPhone,
          notes: templateMeta.notes || "",
        },
      ],
    };
  });

export const buildExtraStops = (formattedStops, startSequence) =>
  formattedStops.map((stop, index) => ({
    ...stop,
    sequence: startSequence + index,
    recipientsMeta: [],
  }));

export const buildHandoverAssignment = ({
  previous,
  driverUserId,
  driverId,
  now = new Date(),
}) => ({
  _id: newObjectId(),
  userId: driverUserId,
  driverId,
  driverUserId,
  vehicleId: previous.vehicleId,
  assignedBy: previous.assignedBy,
  assignedAt: now,
  acceptedAt: now,
  status: TRIP_STATUS.ACCEPTED,
  currentStopIndex: previous.currentStopIndex,
});

export const nextStopSequence = (stops) =>
  stops.reduce((max, stop) => Math.max(max, stop.sequence), 0) + 1;

export const hasFinishedAllStops = (assignment, stopCount) =>
  assignment.currentStopIndex > stopCount;

export const buildRunSummary = (trip) => ({
  tripId: trip._id,
  companyRouteId: trip.companyRouteId,
  status: trip.status,
  isTripEnded: trip.isTripEnded,
  startedAt: trip.startedAt,
  completedAt: trip.completedAt,
});

export const buildStartResult = (runTrip) => {
  const assignment = findActiveAssignment(runTrip) ?? runTrip.recipients[0];

  return {
    message: COMPANY_RESPONSES.RUN_STARTED,
    trip: {
      ...buildRunSummary(runTrip),
      recipientId: assignment._id,
      vehicleId: assignment.vehicleId,
      currentStopIndex: assignment.currentStopIndex,
    },
  };
};
