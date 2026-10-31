import { tripQueue } from "./trip.queue.js";
import { TRIP_QUEUE } from "../constants/trip.constants.js";

export const addTripLocationJob = async (data) => {
  await tripQueue.add(
    TRIP_QUEUE.JOBS.LOCATION_UPDATE,
    data,
    TRIP_QUEUE.JOB_OPTIONS
  );
};
