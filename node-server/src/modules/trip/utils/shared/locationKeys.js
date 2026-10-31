import { TRIP_REDIS_KEYS } from "../../constants/shared/trip.redis.keys.js";

export const driverLocationKeys = (driverUserId) => [
  `${TRIP_REDIS_KEYS.DRIVER_LOCATION}${driverUserId}`,
  `${TRIP_REDIS_KEYS.DRIVER_HEARTBEAT}${driverUserId}`,
];

export const tripLocationKeys = ({ tripId, driverUserId }) => [
  `${TRIP_REDIS_KEYS.TRIP_DATA}${tripId}`,
  ...driverLocationKeys(driverUserId),
];
