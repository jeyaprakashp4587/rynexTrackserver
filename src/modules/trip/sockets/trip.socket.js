import { addTripLocationJob } from "../queues/trip.jobs.js";
import { saveDriverLocation } from "../redis/trip.redis.js";

export const tripSocket = (io, socket) => {
  socket.on("trip:location:update", async (data) => {
    console.log("trip data", data);

    await saveDriverLocation(data);

    await addTripLocationJob(data);

    io.to(data.tripId).emit("trip:location:updated", data);
  });
};
