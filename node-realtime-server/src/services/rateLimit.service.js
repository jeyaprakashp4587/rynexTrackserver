import env from "../config/env.js";

const MIN_INTERVAL = Math.max(
  1000,
  Number(env.LOCATION_UPDATE_INTERVAL_MS) || 3000
);
const lastSeen = new Map();

export const allowLocationUpdate = (driverId) => {
  const now = Date.now();
  const prev = lastSeen.get(driverId) || 0;
  if (now - prev < MIN_INTERVAL) return false;
  lastSeen.set(driverId, now);
  return true;
};

export default { allowLocationUpdate };
