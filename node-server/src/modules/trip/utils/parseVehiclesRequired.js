import { DEFAULT_VEHICLES_REQUIRED } from "../constants/trip.constants.js";
import { TRIP_ERRORS } from "../constants/trip.messages.js";

export const parseVehiclesRequired = (value, recipientCount) => {
  const vehiclesRequired =
    value === undefined ? DEFAULT_VEHICLES_REQUIRED : Number(value);

  if (!Number.isInteger(vehiclesRequired) || vehiclesRequired < 1) {
    throw new Error(TRIP_ERRORS.INVALID_VEHICLES_REQUIRED);
  }

  if (vehiclesRequired > recipientCount) {
    throw new Error(TRIP_ERRORS.VEHICLES_EXCEED_RECIPIENTS);
  }

  return vehiclesRequired;
};
