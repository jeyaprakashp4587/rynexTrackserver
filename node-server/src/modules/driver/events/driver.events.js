export const TOPIC_DRIVER_UPDATED = "driver.updated";

export const buildDriverUpdated = (driver) => ({
  event: "DRIVER_UPDATED",
  data: driver,
  timestamp: new Date().toISOString(),
});

export const handleDriverEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Driver Kafka event received:", parsed);
  return parsed;
};

export default {
  handleDriverEvent,
  buildDriverUpdated,
};
