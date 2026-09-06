export const TOPIC_VEHICLE_UPDATED = "vehicle.updated";

export const buildVehicleUpdated = (vehicle) => ({
  event: "VEHICLE_UPDATED",
  data: vehicle,
  timestamp: new Date().toISOString(),
});
