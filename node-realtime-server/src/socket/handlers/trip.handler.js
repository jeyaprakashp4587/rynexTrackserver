import { tripRoom } from "../rooms.js";
import { logger } from "../../utils/logger.js";

export const handleTripJoin = async (io, socket, payload) => {
  try {
    const { tripId } = payload || {};
    if (!tripId) throw new Error("tripId required");
    // In future, verify authorization with main API here
    socket.join(tripRoom(tripId));
    logger.info(
      "socket:trip:join",
      `socket ${socket.id} joined trip ${tripId}`
    );
    socket.emit("ok", { joined: tripId });
  } catch (err) {
    logger.warn("socket:trip:join:error", err.message);
    socket.emit("error", { message: err.message });
  }
};

export const handleTripLeave = async (io, socket, payload) => {
  try {
    const { tripId } = payload || {};
    if (!tripId) throw new Error("tripId required");
    socket.leave(tripRoom(tripId));
    logger.info("socket:trip:leave", `socket ${socket.id} left trip ${tripId}`);
    socket.emit("ok", { left: tripId });
  } catch (err) {
    logger.warn("socket:trip:leave:error", err.message);
    socket.emit("error", { message: err.message });
  }
};

export default { handleTripJoin, handleTripLeave };
