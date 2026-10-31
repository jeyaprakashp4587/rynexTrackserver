import { Worker } from "bullmq";

import { redis } from "../../../config/redis.config.js";
import { LOG_MESSAGES, TRIP_QUEUE } from "../constants/trip.constants.js";

const tripWorker = new Worker(
  TRIP_QUEUE.NAME,
  async (job) => {
    switch (job.name) {
      case TRIP_QUEUE.JOBS.LOCATION_UPDATE:
        console.log(job.data);
        break;
    }
  },
  { connection: redis }
);

tripWorker.on("completed", (job) => {
  console.log(LOG_MESSAGES.JOB_COMPLETED(job.id));
});

tripWorker.on("failed", (job, err) => {
  console.log(err);
});
