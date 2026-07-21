import { Worker } from "bullmq";

import { redis } from "../../../config/redis.config.js";

const tripWorker = new Worker(
  "tripQueue",

  async (job) => {
    switch (job.name) {
      case "TRIP_LOCATION_UPDATE":
        console.log(job.data);

        /*
               heavy work here

               db update
               eta calculate
               notification
               analytics
            */

        break;
    }
  },

  {
    connection: redis,
  }
);

tripWorker.on("completed", (job) => {
  console.log(`Job completed ${job.id}`);
});

tripWorker.on("failed", (job, err) => {
  console.log(err);
});
