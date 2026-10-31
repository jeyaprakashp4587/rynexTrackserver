import { GEO_POINT_TYPE } from "../../constants/shared/trip.constants.js";
import { TRIP_ERRORS } from "../../constants/generic/trip.messages.js";

const isCoordinate = (value) => typeof value === "number" && Number.isFinite(value);

export const formatTripStop = (stops) => {
  return stops.map((stop, index) => {
    const { lat, lon } = stop?.coords ?? {};

    if (!isCoordinate(lat) || !isCoordinate(lon)) {
      throw new Error(TRIP_ERRORS.INVALID_STOP_COORDINATES);
    }

    return {
      locationName: stop.locationName,
      coords: {
        type: GEO_POINT_TYPE,
        coordinates: [lon, lat],
      },
      sequence: index + 1,
      stopType: stop.stopType,
      contactPerson: stop.contactPerson,
      contactPhone: stop.contactPhone,
    };
  });
};
