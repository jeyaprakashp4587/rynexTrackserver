import heartbeatService from "../redis/heartbeat/driver-heartbeat.service.js";

export const isDriverOnline = async (driverId) => {
  return heartbeatService.isDriverOnline(driverId);
};

export default { isDriverOnline };
