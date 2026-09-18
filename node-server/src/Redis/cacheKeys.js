export const redisCacheKeys = {
  COMPANY: {
    BY_ID: (companyId) => `company:${companyId}`,
    BY_OWNER: (ownerId) => `company:owner:${ownerId}`,
    DRIVERS_BY_OWNER: (ownerId) => `company:drivers:${ownerId}`,
    VEHICLES_BY_OWNER: (ownerId) => `company:vehicles:${ownerId}`,
  },
  VEHICLE: {
    BY_ID: (vehicleId) => `vehicle:${vehicleId}`,
    COMPANY_VEHICLES: (ownerId) => `vehicle:company:${ownerId}`,
    NEARBY: ({ lat, lon, radiusKm, vehicleType }) =>
      `vehicle:nearby:${lat}:${lon}:${radiusKm}:${vehicleType || "all"}`,
  },
};
