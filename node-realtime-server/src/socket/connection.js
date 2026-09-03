import { logger } from "../utils/logger.js";
import { userRoom, driverRoom, EVENTS } from "./rooms.js";
import { handleLocationUpdate } from "./handlers/location.handler.js";
import { handleTripJoin, handleTripLeave } from "./handlers/trip.handler.js";

export const onConnection = (io, socket) => {
  const user = socket.data.user;
  if (!user || !user.id) {
    socket.disconnect(true);
    return;
  }

  logger.info("socket:connect", `socket connected ${socket.id}`, { user });

  // join user room
  socket.join(userRoom(user.id));

  // register handlers
  socket.on(EVENTS.TRIP_JOIN, (payload) => handleTripJoin(io, socket, payload));
  socket.on(EVENTS.TRIP_LEAVE, (payload) =>
    handleTripLeave(io, socket, payload)
  );
  socket.on(EVENTS.LOCATION_UPDATE, (payload) =>
    handleLocationUpdate(io, socket, payload)
  );
  socket.on(EVENTS.DRIVER_HEARTBEAT, () => {
    // optional explicit heartbeat
    socket.emit("ok");
  });

  socket.on("disconnect", (reason) => {
    logger.info("socket:disconnect", `socket ${socket.id} disconnected`, {
      reason,
      user,
    });
  });
};

export default onConnection;
