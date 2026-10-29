import tripEvents from "./trip.events.js";

export const handleTripEvent = async (payload) => {
  return tripEvents.handleTripEvent(payload);
};

export default {
  handleTripEvent,
};
