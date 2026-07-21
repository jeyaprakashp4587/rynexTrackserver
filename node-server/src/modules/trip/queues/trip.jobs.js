import { tripQueue } from "./trip.queue.js";

export const addTripLocationJob = async (data) => {
  await tripQueue.add("TRIP_LOCATION_UPDATE", data, {
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: false,
  });
};
