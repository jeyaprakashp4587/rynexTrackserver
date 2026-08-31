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
  });
};

export const findNearbyVehicleOptions = async ({ lat, lon, radiusKm }) => {
  return findNearbyVehicles({ lat, lon, radiusKm });
};
