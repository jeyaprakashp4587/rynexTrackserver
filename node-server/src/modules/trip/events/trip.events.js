import { TOPICS } from "../../../kafka/kafka.config.js";

export const TOPIC_TRIP_CREATED = TOPICS.TRIP;
export const TOPIC_TRIP_UPDATED = TOPICS.TRIP;
export const TOPIC_TRIP_ACCEPTED = TOPICS.TRIP;

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

export const buildTripAccepted = (trip) => ({
  event: "TRIP_ACCEPTED",
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
  buildTripAccepted,
};
