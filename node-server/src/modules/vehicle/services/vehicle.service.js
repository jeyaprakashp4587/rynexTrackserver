import {
  createDriverVehicleRecord,
  createVehicleRecord,
  findNearbyVehicles,
  getCompanyVehicles,
} from "../repositories/vehicle.repository.js";

export const createVehicle = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  companyId,
  vehicleType,
}) => {
  if (!vehicleNumber) {
    throw new Error("Vehicle number is required");
  }

  return createVehicleRecord({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    coordinates,
    companyId,
    vehicleType,
  });
};

export const getCompanyVehicleList = async (userId) => {
  const companyVehicles = await getCompanyVehicles(userId);
  return companyVehicles?.vehicles || [];
};

export const createDriverVehicle = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  userId,
  vehicleType,
}) => {
  if (!vehicleNumber) {
    throw new Error("Vehicle number is required");
  }

  return createDriverVehicleRecord({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    coordinates,
    userId,
    vehicleType,
  });
};

export const findNearbyVehicleOptions = async ({
  lat,
  lon,
  radiusKm,
  vehicleType,
}) => {
  return findNearbyVehicles({ lat, lon, radiusKm, vehicleType });
};
