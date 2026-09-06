export const TOPIC_DRIVER_UPDATED = "driver.updated";

export const buildDriverUpdated = (driver) => ({
  event: "DRIVER_UPDATED",
  data: driver,
  timestamp: new Date().toISOString(),
});
