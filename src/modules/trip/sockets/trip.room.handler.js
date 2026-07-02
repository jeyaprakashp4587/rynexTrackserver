import { TRIP_SOCKET_EVENTS } from "../constants/trip.socket.events.js";
import { socketRooms } from "../../../sockets/socket.room.manager.js";

export const registerTripRoomHandlers = (socket) => {
  // trip join
  socket.on(TRIP_SOCKET_EVENTS.JOIN, ({ tripId }) => {
    socket.join(socketRooms.tripRoom(tripId));
    console.log(`joined trip room ${tripId}`);
  });
  // trip leave
  socket.on(TRIP_SOCKET_EVENTS.LEAVE, ({ tripId }) => {
    socket.leave(socketRooms.tripRoom(tripId));

    console.log(`left trip room ${tripId}`);
  });
};
