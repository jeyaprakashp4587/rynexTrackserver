import { Queue } from "bullmq";
import { redis } from "../../../config/redis.config.js";
import { TRIP_QUEUE } from "../constants/shared/trip.constants.js";

export const tripQueue = new Queue(TRIP_QUEUE.NAME, {
  connection: redis,
});
