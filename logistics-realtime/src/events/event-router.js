import { logger } from "../utils/logger.js";
import { userRoom, tripRoom } from "../socket/rooms.js";

export const routeEvent = (io, envelope) => {
  try {
    const { type, data } = envelope || {};
    if (!type) return;

    // simple routing rules
    if (type.startsWith("trip.")) {
      const tripId = data?.tripId;
      const driverId = data?.driverId;
      if (tripId) io.to(tripRoom(tripId)).emit(type, envelope);
      if (driverId) io.to(userRoom(driverId)).emit(type, envelope);
      return;
    }

    if (type.startsWith("driver.")) {
      const driverId = data?.driverId;
      if (driverId) io.to(userRoom(driverId)).emit(type, envelope);
      return;
    }

    // other events broadcast to all
    io.emit(type, envelope);
  } catch (err) {
    logger.error("event-router:error", err.message);
  }
};

export default routeEvent;
