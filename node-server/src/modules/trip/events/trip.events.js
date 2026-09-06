export const TOPIC_TRIP_CREATED = "trip.created";
export const TOPIC_TRIP_UPDATED = "trip.updated";

export const buildTripCreated = (trip) => ({
  event: "TRIP_CREATED",
  data: trip,
  timestamp: new Date().toISOString(),
});

export const buildTripUpdated = (trip) => ({
  event: "TRIP_UPDATED",
  data: trip,
  timestamp: new Date().toISOString(),
});
