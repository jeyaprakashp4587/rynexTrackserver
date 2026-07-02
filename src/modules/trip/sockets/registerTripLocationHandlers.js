import { TRIP_SOCKET_EVENTS } from "../constants/trip.socket.events.js";

import { saveDriverLocation } from "../redis/trip.redis.js";

import { socketRooms } from "../../../sockets/socket.room.manager.js";

export const registerTripLocationHandlers = (io, socket) => {
  socket.on(
    TRIP_SOCKET_EVENTS.LOCATION_UPDATE,

    async (data) => {
      console.log("trip data", data);

      await saveDriverLocation(data);

      io.to(socketRooms.tripRoom(data.tripId)).emit(
        TRIP_SOCKET_EVENTS.LOCATION_UPDATED,
        data
      );
    }
  );
};
