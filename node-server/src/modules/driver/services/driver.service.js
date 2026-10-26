import { Company } from "../../company/models/company.model.js";
import {
  changeAvailabilityStatus as updateDriverAvailabilityStatus,
  changeTripStatus as updateDriverTripStatus,
  createDriverRecord,
  createIndependentDriver,
  findCompanyDrivers,
  findDriverByUserId,
  linkDriverToCompany,
} from "../repositories/driver.repository.js";

export const getDriverProfile = async (driverAuthId) => {
  const driver = await findDriverByUserId(driverAuthId);
  if (!driver) {
    throw new Error("Driver not found");
  }

  return driver;
};

export const createCompanyDriver = async ({ companyId, driverForm }) => {
  const { name, MobileNumber, image, vehicleId } = driverForm;

  if (!name || !MobileNumber) {
    throw new Error("Name and MobileNumber are required");
  }

  const newDriver = await createDriverRecord({
    name,
    MobileNumber,
    image,
    companyId,
  });

  if (companyId) {
    await linkDriverToCompany(companyId, newDriver._id);
  }

  return newDriver;
};

export const onboardDriver = async ({
  name,
  MobileNumber,
  image,
  coordinates,
}) => {
  if (!name || !MobileNumber) {
    throw new Error("Name and MobileNumbekr are required");
  }

  return createIndependentDriver({
    name,
    MobileNumber,
    image,
    coordinates,
  });
};

export const getCompanyDrivers = async (userId) => {
  const company = await findCompanyDrivers(userId);
  if (!company) {
    return [];
  }

  return company.drivers;
};

export const changeAvailabilityStatus = async ({
  userId,
  driverId,
  newAvailabilityStatus,
}) => {
  const update = await updateDriverAvailabilityStatus({
    userId,
    driverId,
    newAvailabilityStatus,
  });

  if (!update) {
    throw new Error("Failed to update availability status");
  }

  return update;
};

export const changeTripStatus = async ({ userId, driverId, newTripStatus }) => {
  const update = await updateDriverTripStatus({
    userId,
    driverId,
    newTripStatus,
  });

  if (!update) {
    throw new Error("Failed to update trip status");
  }

  return update;
};
