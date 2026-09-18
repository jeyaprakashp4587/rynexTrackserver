export const driverCacheKeys = {
  DRIVER: {
    BY_ID: (driverId) => `driver:${driverId}`,
    BY_USER_ID: (userId) => `driver:user:${userId}`,
    LOCATION: (driverId) => `driver:location:${driverId}`,
    HEARTBEAT: (driverId) => `driver:heartbeat:${driverId}`,
  },
};
