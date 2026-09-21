export const TOPIC_VEHICLE_UPDATED = "vehicle.updated";

export const buildVehicleUpdated = (vehicle) => ({
  event: "VEHICLE_UPDATED",
  data: vehicle,
  timestamp: new Date().toISOString(),
});

export const handleVehicleEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Vehicle Kafka event received:", parsed);
  return parsed;
};

export default {
  handleVehicleEvent,
  buildVehicleUpdated,
};
