import { Company } from "../../company/models/company.model.js";
import { Driver } from "../../driver/models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { buildNearbyVehiclesPipeline } from "../pipelines/vehicles.pipeline.js";

export const createVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  companyId,
}) => {
  return Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    companyId,
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
  return Company.findOne({ owner: userId }).populate("vehicles", {
    vehicleNumber: 1,
    vehicleImage: 1,
    vehicleModel: 1,
    pricePerKm: 1,
  });
};

export const createDriverVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  pricePerKm,
  userId,
}) => {
  const vehicle = await Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
    pricePerKm,
    currentLocation: {
      type: "Point",
      coordinates: coordinates || [0, 0],
    },
  });

  await Driver.findByIdAndUpdate(userId, { $push: { vehicles: vehicle._id } });
  await Vehicle.findByIdAndUpdate(vehicle._id, { currentDriver: userId });

  return vehicle;
};

export const findNearbyVehicles = async ({ lat, lon, radiusKm = 50 }) => {
  return Vehicle.aggregate(buildNearbyVehiclesPipeline({ lat, lon, radiusKm }));
};
