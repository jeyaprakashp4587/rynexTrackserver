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
