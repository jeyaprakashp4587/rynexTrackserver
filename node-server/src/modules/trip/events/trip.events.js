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

export const handleTripEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Trip Kafka event received:", parsed);
  return parsed;
};

export default {
  handleTripEvent,
  buildTripCreated,
  buildTripUpdated,
};
