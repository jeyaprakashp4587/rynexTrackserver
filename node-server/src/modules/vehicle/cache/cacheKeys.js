export const vehicleCacheKeys = {
  VEHICLE: {
    BY_ID: (vehicleId) => `vehicle:${vehicleId}`,
    COMPANY_VEHICLES: (ownerId) => `vehicle:company:${ownerId}`,
    DRIVER_VEHICLES: (userId) => `vehicle:driver:${userId}`,
    LOCATION: (vehicleId) => `vehicle:location:${vehicleId}`,
    HEARTBEAT: (vehicleId) => `vehicle:heartbeat:${vehicleId}`,
  },
  GEO: {
    VEHICLES: (vehicleType = "all") => `vehicle:geo:${vehicleType}`,
  },
};
