import { Vehicles } from "../models/Vehicle";

export const findNearbyVehicles = async ({ lng, lat, radius }) => {
  const vehicles = await Vehicles.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },

        $maxDistance: radius,
      },
    },
  });

  return vehicles;
};
