import { publishEvent } from "../../../kafka/index.js";
import { TOPICS } from "../../../kafka/kafka.config.js";
import { buildTripCreated, buildTripUpdated } from "./trip.events.js";

export const publishTripCreated = async (trip) => {
  return publishEvent(TOPICS.TRIP, buildTripCreated(trip));
};

export const publishTripUpdated = async (trip) => {
  return publishEvent(TOPICS.TRIP, buildTripUpdated(trip));
};

export default {
  publishTripCreated,
  publishTripUpdated,
};
