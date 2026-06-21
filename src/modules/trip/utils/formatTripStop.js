export const formatTripStop = (stops) => {
  return stops.map((stop, index) => ({
    locationName: stop.locationName,
    coords: {
      type: "Point",
      coordinates: [stop.coords.lon, stop.coords.lat],
    },
    sequence: index + 1,
    stopType: stop.stopType,
    contactPerson: stop.contactPerson,
    contactPhone: stop.contactPhone,
  }));
};
