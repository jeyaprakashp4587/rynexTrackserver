import { logger } from "../../utils/logger.js";
import locationService from "../../services/location.service.js";
import rateLimitService from "../../services/rateLimit.service.js";
import { EVENTS, tripRoom } from "../rooms.js";
import { AppError } from "../../utils/errors.js";

export const handleLocationUpdate = async (io, socket, payload) => {
  try {
    const user = socket.data.user;
    if (!user || user.role !== "driver")
      throw new AppError("Only drivers may send location updates", 403);

    const { tripId, latitude, longitude } = payload || {};
    if (!tripId) throw new AppError("tripId required", 400);
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90)
      throw new AppError("invalid latitude", 400);
    if (Number.isNaN(lon) || lon < -180 || lon > 180)
      throw new AppError("invalid longitude", 400);

    const driverId = user.id;
    const timestamp = new Date().toISOString();

    if (!rateLimitService.allowLocationUpdate(driverId)) {
      logger.warn(
        "socket:location:rate_limit",
        `driver ${driverId} rate limited`
      );
      return socket.emit("error", { message: "rate_limited" });
    }

    await locationService.updateDriverLocation({
      driverId,
      tripId,
      latitude: lat,
      longitude: lon,
      timestamp,
    });

    // broadcast
    io.to(tripRoom(tripId)).emit(EVENTS.LOCATION_UPDATED, {
      driverId,
      latitude: lat,
      longitude: lon,
      timestamp,
    });
  } catch (err) {
    logger.warn("socket:location:error", err.message, { id: socket.id });
    socket.emit("error", { message: err.message });
  }
};

export default handleLocationUpdate;
