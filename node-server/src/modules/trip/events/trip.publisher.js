import { sendMessage } from "../../../kafka/index.js";
import {
  TOPIC_TRIP,
  buildTripAccepted,
  buildTripAssigned,
  buildTripCreated,
  buildTripFulfilled,
  buildTripRejected,
  buildTripStopUpdated,
  buildTripUpdated,
} from "./trip.events.js";

const publish = async (message) => {
  try {
    await sendMessage(TOPIC_TRIP, message);
  } catch (error) {
    console.warn(
      `Failed to publish ${message.event} event:`,
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

export default {
  publishTripCreated,
  publishTripUpdated,
  publishTripAccepted,
  publishTripAssigned,
  publishTripRejected,
  publishTripFulfilled,
  publishTripStopUpdated,
};
