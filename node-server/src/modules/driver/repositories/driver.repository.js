import { Company } from "../../company/models/company.model.js";
import { Driver } from "../models/driver.model.js";

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
  return Driver.findOne({ driverUserId: driverAuthId }, { vehicles: 0 });
};

export const findCompanyDrivers = async (userId) => {
  return Company.findOne({ owner: userId }).populate("drivers", {
    name: 1,
    MobileNumber: 1,
    image: 1,
    driverUserId: 1,
    currentlyAvailable: 1,
  });
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
