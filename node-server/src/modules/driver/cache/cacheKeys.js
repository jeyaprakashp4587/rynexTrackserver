export const driverCacheKeys = {
  DRIVER: {
    BY_ID: (driverId) => `driver:${driverId}`,
    BY_USER_ID: (userId) => `driver:user:${userId}`,
  },
};
