import { Company } from "../../company/models/company.model.js";
import { Driver } from "../../driver/models/driver.model.js";
import { Vehicle } from "../models/vehicle.model.js";

export const createVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  companyId,
}) => {
  return Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
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
  });
};

export const createDriverVehicleRecord = async ({
  vehicleNumber,
  vehicleImage,
  vehicleModel,
  coordinates,
  userId,
}) => {
  const vehicle = await Vehicle.create({
    vehicleNumber,
    vehicleImage,
    vehicleModel,
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
  const maxDistance = Number(radiusKm) * 1000;

  return Vehicle.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(lon), Number(lat)],
        },
        distanceField: "distanceInMeters",
        spherical: true,
        maxDistance,
        query: {
          currentlyAvailable: true,
        },
      },
    },
    {
      $lookup: {
        from: "drivers",
        localField: "currentDriver",
        foreignField: "_id",
        as: "driver",
      },
    },
    {
      $unwind: {
        path: "$driver",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "company",
      },
    },
    {
      $unwind: {
        path: "$company",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "company.owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: {
        path: "$owner",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        vehicleId: "$_id",
        vehicleNumber: 1,
        vehicleModel: 1,
        vehicleImage: 1,
        currentLocation: 1,
        distanceKm: {
          $round: [{ $divide: ["$distanceInMeters", 1000] }, 2],
        },
        driverId: { $ifNull: ["$driver._id", null] },
        driverUserId: { $ifNull: ["$driver.driverUserId", null] },
        driverName: { $ifNull: ["$driver.name", null] },
        driverImage: { $ifNull: ["$driver.image", null] },
        driverMobile: { $ifNull: ["$driver.MobileNumber", null] },
        isIndependentDriver: {
          $ifNull: ["$driver.isIndependentDriver", false],
        },
        companyId: { $ifNull: ["$company._id", null] },
        companyName: { $ifNull: ["$company.companyName", null] },
        ownerId: { $ifNull: ["$owner._id", null] },
        ownerName: { $ifNull: ["$owner.Name", null] },
        ownerMobile: { $ifNull: ["$owner.MobileNumber", null] },
        bookingType: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$currentDriver", null] },
                then: "VEHICLE_ONLY",
              },
              {
                case: { $eq: ["$driver.isIndependentDriver", true] },
                then: "INDEPENDENT_TRIP",
              },
            ],
            default: "COMPANY_TRIP",
          },
        },
      },
    },
    {
      $sort: {
        distanceKm: 1,
      },
    },
  ]);
};
