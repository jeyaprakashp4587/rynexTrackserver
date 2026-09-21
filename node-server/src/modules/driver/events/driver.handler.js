import driverEvents from "./driver.events.js";

export const handleDriverEvent = async (payload) => {
  return driverEvents.handleDriverEvent(payload);
};

export default {
  handleDriverEvent,
};
