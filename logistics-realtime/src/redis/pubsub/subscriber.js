import { REDIS_CHANNELS } from "./channels.js";
import { logger } from "../../../utils/logger.js";
import { routeEvent } from "../../events/event-router.js";

export const startSubscriber = async (subClient, io) => {
  // subscribe to known channels
  await subClient.subscribe(REDIS_CHANNELS.TRIP_EVENTS, (message) =>
    handleMessage(io, message)
  );
  await subClient.subscribe(REDIS_CHANNELS.DRIVER_EVENTS, (message) =>
    handleMessage(io, message)
  );
  await subClient.subscribe(REDIS_CHANNELS.BOOKING_EVENTS, (message) =>
    handleMessage(io, message)
  );
  logger.info("pubsub:subscriber", "subscribed to channels");
};

const handleMessage = (io, message) => {
  try {
    const parsed = JSON.parse(message);
    routeEvent(io, parsed);
  } catch (err) {
    logger.warn("pubsub:message:invalid", err.message);
  }
};

export default { startSubscriber };
