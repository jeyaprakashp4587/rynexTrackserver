import { sendMessage } from "../../../kafka/index.js";
import {
  TOPIC_TRIP,
  buildTripAccepted,
  buildTripAssigned,
  buildTripCreated,
  buildTripFulfilled,
  buildTripEnded,
  buildTripHandover,
  buildTripRejected,
  buildTripStarted,
  buildTripStopsAdded,
  buildTripStopUpdated,
  buildTripUpdated,
} from "./trip.events.js";

import { LOG_MESSAGES } from "../constants/shared/trip.constants.js";

const publish = async (message) => {
  try {
    await sendMessage(TOPIC_TRIP, message);
  } catch (error) {
    console.warn(
      LOG_MESSAGES.PUBLISH_FAILED(message.event),
      error?.message || error
    );
  }
};

export const publishTripCreated = (trip) => publish(buildTripCreated(trip));

export const publishTripUpdated = (trip) => publish(buildTripUpdated(trip));

export const publishTripAccepted = (data) => publish(buildTripAccepted(data));

export const publishTripAssigned = (data) => publish(buildTripAssigned(data));

export const publishTripRejected = (data) => publish(buildTripRejected(data));

export const publishTripFulfilled = (data) => publish(buildTripFulfilled(data));

export const publishTripStopUpdated = (data) =>
  publish(buildTripStopUpdated(data));

export const publishTripStarted = (data) => publish(buildTripStarted(data));

export const publishTripHandover = (data) => publish(buildTripHandover(data));

export const publishTripStopsAdded = (data) =>
  publish(buildTripStopsAdded(data));

export const publishTripEnded = (data) => publish(buildTripEnded(data));

export default {
  publishTripCreated,
  publishTripUpdated,
  publishTripAccepted,
  publishTripAssigned,
  publishTripRejected,
  publishTripFulfilled,
  publishTripStopUpdated,
  publishTripStarted,
  publishTripHandover,
  publishTripStopsAdded,
  publishTripEnded,
};
