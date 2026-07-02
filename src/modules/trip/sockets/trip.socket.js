import { registerTripLocationHandlers } from "./registerTripLocationHandlers.js";
import { registerTripRoomHandlers } from "./trip.room.handler.js";

export const tripSocket = (io, socket) => {
  // config trip
  registerTripRoomHandlers(socket);

  registerTripLocationHandlers(io, socket);
};
