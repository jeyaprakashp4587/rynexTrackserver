export const vehicleCacheKeys = {
  VEHICLE: {
    BY_ID: (vehicleId) => `vehicle:${vehicleId}`,
    COMPANY_VEHICLES: (ownerId) => `vehicle:company:${ownerId}`,
  },
  GEO: {
    VEHICLES: (vehicleType = "all") => `vehicle:geo:${vehicleType}`,
  },
};
