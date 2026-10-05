import { Company } from "../../company/models/company.model.js";
import { Driver } from "../models/driver.model.js";
import { companyCache } from "../../company/cache/company.cache.js";
import { driverCache } from "../cache/driver.cache.js";
import { DRIVER_AVAILABILITY } from "../constants/driver.constants.js";

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
      Company.findOne({ owner: userId })
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

export const changeAvailabilityStatus = async (
  userId,
  newAvailabilityStatus
) => {
  const update = await Driver.findOneAndUpdate(
    { driverUserId: userId },
    { availability: newAvailabilityStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update availability status");
  }

  return update;
};

export const changeTripStatus = async (userId, newTripStatus) => {
  const update = await Driver.findOneAndUpdate(
    { driverUserId: userId },
    { tripStatus: newTripStatus },
    { new: true }
  );

  if (!update) {
    throw new Error("Failed to update trip status");
  }

  return update;
};
