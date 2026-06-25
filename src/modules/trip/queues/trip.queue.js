import { Queue } from "bullmq";
import { redis } from "../../../config/redis.config.js";

export const tripQueue = new Queue("tripQueue", {
  connection: redis,
});
