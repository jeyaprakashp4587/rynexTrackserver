import { Company } from "../../company/models/company.model.js";
import { Driver } from "../models/driver.model.js";
import { companyCache } from "../../company/cache/company.cache.js";
import { driverCache } from "../cache/driver.cache.js";
import { DRIVER_AVAILABILITY } from "../constants/driver.constants.js";
import { availabilityCache } from "../../../shared/availability/availability.cache.js";

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

export const updateDriverAvailability = async ({
  driverId,
  userId,
  availability,
}) => {
  const filter = driverId ? { _id: driverId } : { driverUserId: userId };

  const existingDriver = await Driver.findOne(filter).lean();

  if (!existingDriver) {
    throw new Error("Driver not found");
  }
  const nextAvailability = availability;

  if (!nextAvailability) {
    throw new Error("Availability is required");
  }

  const currentAvailability = existingDriver.availability
    ? existingDriver.availability
    : DRIVER_AVAILABILITY.AVAILABLE;

  if (currentAvailability === nextAvailability) {
    return existingDriver;
  }

  const updatedDriver = await Driver.findOneAndUpdate(
    filter,
    {
      $set: {
        availability: nextAvailability,
      },
    },
    { new: true }
  ).lean();

  if (updatedDriver.availability === DRIVER_AVAILABILITY.AVAILABLE) {
    // Invalidate existing cache keys first, then set fresh data
    await driverCache.invalidateByDriver(
      updatedDriver._id.toString(),
      updatedDriver.driverUserId ? updatedDriver.driverUserId.toString() : null
    );

    await driverCache.setById(
      updatedDriver._id.toString(),
      updatedDriver,
      3600
    );

    if (updatedDriver.driverUserId) {
      await driverCache.setByUserId(
        updatedDriver.driverUserId.toString(),
        updatedDriver,
        3600
      );
    }
  } else {
    await driverCache.invalidateByDriver(
      updatedDriver._id.toString(),
      updatedDriver.driverUserId ? updatedDriver.driverUserId.toString() : null
    );
  }

  // Mirror availability into shared availability cache
  try {
    await availabilityCache.set(
      "driver",
      updatedDriver._id.toString(),
      updatedDriver.availability
    );
  } catch (e) {
    // non-fatal
    console.warn("availabilityCache set driver failed", e.message || e);
  }

  if (updatedDriver.companyId) {
    const company = await Company.findById(updatedDriver.companyId)
      .select("owner")
      .lean();

    if (company?.owner) {
      await companyCache.invalidateByOwner(company.owner.toString());
    }
  }

  return updatedDriver;
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
