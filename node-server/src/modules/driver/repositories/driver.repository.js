import { Company } from "../../company/models/company.model.js";
import { Driver } from "../models/driver.model.js";
import { companyCache } from "../../company/cache/company.cache.js";
import { driverCache } from "../cache/driver.cache.js";
import {
  DRIVER_AVAILABILITY,
  DRIVER_AVAILABILITY_VALUES,
  DRIVER_TRIP_STATUS,
  DRIVER_TRIP_STATUS_VALUES,
} from "../constants/driver.constants.js";

export const createDriverRecord = async ({
  name,
  MobileNumber,
  image,
  companyId,
}) => {
  return Driver.create({
    name,
    MobileNumber,
    image,
    companyId,
    isIndependentDriver: false,
  });
};

export const linkDriverToCompany = async (companyId, driverId) => {
  return Company.findByIdAndUpdate(
    companyId,
    { $push: { drivers: driverId } },
    { new: true }
  );
};

export const findDriverByUserId = async (driverAuthId) => {
  return driverCache.getByUserId(
    driverAuthId,
    () =>
      Driver.findOne({ driverUserId: driverAuthId }, { vehicles: 0 }).lean(),
    3600
  );
};

export const findCompanyDrivers = async (userId) => {
  return companyCache.getDriversByOwner(
    userId,
    () =>
      Company.findOne({ owners: userId })
        .populate("drivers", {
          name: 1,
          MobileNumber: 1,
          image: 1,
          driverUserId: 1,
          availability: 1,
        })
        .lean(),
    3600
  );
};

export const createIndependentDriver = async ({
  name,
  MobileNumber,
  image,
  coordinates,
}) => {
  return Driver.create({
    name,
    MobileNumber,
    image,
    currentLocation: {
      type: "Point",
      coordinates: coordinates || [0, 0],
    },
  });
};

export const changeAvailabilityStatus = async ({
  userId,
  driverId,
  newAvailabilityStatus,
}) => {
  const normalizedStatus = String(newAvailabilityStatus || "")
    .trim()
    .toUpperCase();

  if (!DRIVER_AVAILABILITY_VALUES.includes(normalizedStatus)) {
    throw new Error(
      `Invalid driver availability status: ${newAvailabilityStatus}`
    );
  }

  const update = await Driver.findOneAndUpdate(
    driverId ? { _id: driverId } : { driverUserId: userId },
    { availability: normalizedStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update availability status");
  }

  return update;
};

export const changeTripStatus = async ({ userId, driverId, newTripStatus }) => {
  const normalizedStatus = String(newTripStatus || "")
    .trim()
    .toUpperCase();

  if (!DRIVER_TRIP_STATUS_VALUES.includes(normalizedStatus)) {
    throw new Error(`Invalid driver trip status: ${newTripStatus}`);
  }

  const update = await Driver.findOneAndUpdate(
    driverId ? { _id: driverId } : { driverUserId: userId },
    { tripStatus: normalizedStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update trip status");
  }

  return update;
};
