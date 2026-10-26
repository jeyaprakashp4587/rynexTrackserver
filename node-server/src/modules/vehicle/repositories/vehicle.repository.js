import { Company } from "../../company/models/company.model.js";
import { Driver } from "../../driver/models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";
import { buildNearbyVehiclesPipeline } from "../pipelines/vehicles.pipeline.js";
import { vehicleCache } from "../cache/vehicle.cache.js";
import {
  VEHICLE_AVAILABILITY,
  VEHICLE_AVAILABILITY_VALUES,
  VEHICLE_TRIP_STATUS,
  VEHICLE_TRIP_STATUS_VALUES,
} from "../constants/vehicle.constants.js";

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
      Company.findOne({ owners: userId })
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

  const driver = await Driver.findOneAndUpdate(
    { driverUserId: userId },
    { $push: { vehicles: vehicle._id } },
    { new: true }
  );

  if (!driver) {
    throw new Error("Driver profile not found");
  }

  await Vehicle.findByIdAndUpdate(vehicle._id, { currentDriver: driver._id });
  await vehicleCache.invalidateDriverVehicles(userId);

  return vehicle;
};

export const getDriverVehicles = async (userId) => {
  return Driver.findOne({ driverUserId: userId })
    .populate("vehicles", {
      vehicleNumber: 1,
      vehicleImage: 1,
      vehicleModel: 1,
      pricePerKm: 1,
      vehicleType: 1,
      currentLocation: 1,
      availability: 1,
      tripStatus: 1,
    })
    .lean();
};

export const changeAvailabilityStatus = async ({
  vehicleId,
  newAvailabilityStatus,
}) => {
  const normalizedStatus = String(newAvailabilityStatus || "")
    .trim()
    .toUpperCase();

  if (!VEHICLE_AVAILABILITY_VALUES.includes(normalizedStatus)) {
    throw new Error(
      `Invalid vehicle availability status: ${newAvailabilityStatus}`
    );
  }

  const update = await Vehicle.findOneAndUpdate(
    { _id: vehicleId },
    { availability: normalizedStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update vehicle availability status");
  }

  return update;
};

export const changeTripStatus = async ({ vehicleId, newTripStatus }) => {
  const normalizedStatus = String(newTripStatus || "")
    .trim()
    .toUpperCase();

  if (!VEHICLE_TRIP_STATUS_VALUES.includes(normalizedStatus)) {
    throw new Error(`Invalid vehicle trip status: ${newTripStatus}`);
  }

  const update = await Vehicle.findOneAndUpdate(
    { _id: vehicleId },
    { tripStatus: normalizedStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update vehicle trip status");
  }

  return update;
};

export const findNearbyVehicles = async ({
  lat,
  lon,
  radiusKm = 50,
  vehicleType,
}) => {
  return vehicleCache.getNearbyVehicleDrivers(
    { latitude: lat, longitude: lon, radiusKm, vehicleType },
    () =>
      Vehicle.aggregate(
        buildNearbyVehiclesPipeline({ lat, lon, radiusKm, vehicleType })
      ),
    300
  );
};
