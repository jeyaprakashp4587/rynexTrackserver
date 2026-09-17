import { Company } from "../../company/models/company.model.js";
import { Driver } from "../../driver/models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { buildNearbyVehiclesPipeline } from "../pipelines/vehicles.pipeline.js";
import { vehicleCache } from "../cache/vehicle.cache.js";

export const createVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  companyId,
  vehicleType,
}) => {
  return Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    companyId,
    vehicleType,
    currentLocation: {
      type: "Point",
      coordinates: coordinates || [0, 0],
    },
  });
};

export const attachVehicleToCompany = async (companyId, vehicleId) => {
  return Company.findOneAndUpdate(
    { _id: companyId },
    { $push: { vehicles: vehicleId } },
    { new: true }
  );
};

export const getCompanyVehicles = async (userId) => {
  return vehicleCache.getCompanyVehicles(
    userId,
    () =>
      Company.findOne({ owner: userId })
        .populate("vehicles", {
          vehicleNumber: 1,
          vehicleImage: 1,
          vehicleModel: 1,
          pricePerKm: 1,
          vehicleType: 1,
        })
        .lean(),
    3600
  );
};

export const createDriverVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  userId,
  vehicleType,
}) => {
  const vehicle = await Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    vehicleType,
    currentLocation: {
      type: "Point",
      coordinates: coordinates || [0, 0],
    },
  });

  await Driver.findByIdAndUpdate(userId, { $push: { vehicles: vehicle._id } });
  await Vehicle.findByIdAndUpdate(vehicle._id, { currentDriver: userId });

  return vehicle;
};

export const findNearbyVehicles = async ({
  lat,
  lon,
  radiusKm = 50,
  vehicleType,
}) => {
  return vehicleCache.getNearby(
    { lat, lon, radiusKm, vehicleType },
    () =>
      Vehicle.aggregate(
        buildNearbyVehiclesPipeline({ lat, lon, radiusKm, vehicleType })
      ),
    300
  );
};
