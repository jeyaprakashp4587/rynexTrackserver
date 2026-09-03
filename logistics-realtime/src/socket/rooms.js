export const tripRoom = (tripId) => `trip:${tripId}`;
export const userRoom = (userId) => `user:${userId}`;
export const driverRoom = (driverId) => `driver:${driverId}`;

export const EVENTS = {
  LOCATION_UPDATE: "location:update",
  LOCATION_UPDATED: "location:updated",
  DRIVER_HEARTBEAT: "driver:heartbeat",
  DRIVER_ONLINE: "driver:online",
  DRIVER_OFFLINE: "driver:offline",
  TRIP_JOIN: "trip:join",
  TRIP_LEAVE: "trip:leave",
};

export default { tripRoom, userRoom, driverRoom, EVENTS };
