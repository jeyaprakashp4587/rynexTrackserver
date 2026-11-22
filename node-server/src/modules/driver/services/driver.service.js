import { Company } from "../../company/models/company.model.js";
import {
  changeAvailabilityStatus as updateDriverAvailabilityStatus,
  changeTripStatus as updateDriverTripStatus,
  createDriverRecord,
  createIndependentDriver,
  findCompanyDrivers,
  findDriverByUserId,
  linkDriverToCompany,
  updateDriverActiveTrip as repoUpdateDriverActiveTrip,
} from "../repositories/driver.repository.js";
import {
  DRIVER_AVAILABILITY,
  DRIVER_TRIP_STATUS,
} from "../constants/driver.constants.js";
import { TRIP_TYPE } from "../../trip/constants/shared/trip.constants.js";
import * as companyRunService from "../../trip/services/company/company.run.services.js";
import * as tripService from "../../trip/services/generic/trip.services.js";
import { companyRoutes } from "../../trip/models/company/companyRoute.model.js";
import { companyRun } from "../../trip/models/company/companyRun.model.js";
import { Vehicle } from "../../vehicle/models/vehicle.model.js";

const normalizeTripType = (type) => {
  if (!type) return null;
  const upper = String(type).trim().toUpperCase();
  if (upper === "COMPANY" || upper === TRIP_TYPE.COMPANY) {
    return TRIP_TYPE.COMPANY;
  }
  if (upper === "INDEPENDENT" || upper === TRIP_TYPE.INDEPENDENT) {
    return TRIP_TYPE.INDEPENDENT;
  }
  if (upper === "HYBRID" || upper === TRIP_TYPE.HYBRID) {
    return TRIP_TYPE.HYBRID;
  }
  return upper;
};

export const getDriverProfile = async (driverAuthId) => {
  const driver = await findDriverByUserId(driverAuthId);
  if (!driver) {
    throw new Error("Driver not found");
  }

  return driver;
};

export const updateDriverActiveTrip = async ({
  userId,
  driverId,
  activeTripId = null,
  activeTripType = null,
  newTripStatus = null,
  newAvailabilityStatus = null,
}) => {
  const normalizedType = normalizeTripType(activeTripType);
  const tripStatus =
    newTripStatus ||
    (activeTripId ? DRIVER_TRIP_STATUS.ON_TRIP : DRIVER_TRIP_STATUS.IDLE);
  const availability =
    newAvailabilityStatus ||
    (activeTripId ? DRIVER_AVAILABILITY.UNAVAILABLE : DRIVER_AVAILABILITY.AVAILABLE);

  const update = await repoUpdateDriverActiveTrip({
    userId,
    driverId,
    activeTripId: activeTripId || null,
    activeTripType: activeTripId ? normalizedType : null,
    tripStatus,
    availability,
  });

  if (!update) {
    throw new Error("Failed to update active trip");
  }

  return update;
};

export const getDriverActiveTrip = async (userId) => {
  const driver = await findDriverByUserId(userId);
  if (!driver) {
    throw new Error("Driver not found");
  }

  let activeTripId = driver.activeTrip?.activeTripId;
  let activeTripType = driver.activeTrip?.activeTripType;

  // Self-heal/fallback: if activeTripId is missing but status is ON_TRIP
  if (!activeTripId && driver.tripStatus === DRIVER_TRIP_STATUS.ON_TRIP) {
    const openRun = await companyRun
      .findOne({ activeDriverUserId: userId, isTripEnded: false })
      .lean();
    if (openRun) {
      activeTripId = openRun._id;
      activeTripType = TRIP_TYPE.COMPANY;
      await repoUpdateDriverActiveTrip({
        userId,
        activeTripId,
        activeTripType,
        tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
      });
    } else {
      const genericTrips = await tripService
        .getDriverCurrentTripDetails(userId)
        .catch(() => null);
      if (genericTrips?.trip?.length) {
        activeTripId = genericTrips.trip[0]._id;
        activeTripType = TRIP_TYPE.INDEPENDENT;
        await repoUpdateDriverActiveTrip({
          userId,
          activeTripId,
          activeTripType,
          tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
        });
      }
    }
  }

  if (!activeTripId) {
    return {
      isTripActive: false,
      activeTripId: null,
      activeTripType: null,
      driverId: driver._id,
      tripStatus: driver.tripStatus,
      companyTrip: null,
      genericTrip: null,
    };
  }

  const isCompany =
    activeTripType === TRIP_TYPE.COMPANY ||
    String(activeTripType).toUpperCase() === "COMPANY";

  if (isCompany) {
    const runDetails = await companyRunService
      .getDriverCurrentRun(userId)
      .catch(() => null);
    let companyTripDto = null;

    if (runDetails?.trip) {
      const runTrip = runDetails.trip;
      const route = runTrip.companyRouteId
        ? await companyRoutes.findById(runTrip.companyRouteId).lean().catch(() => null)
        : null;
      const vehicle = runTrip.vehicleId
        ? await Vehicle.findById(runTrip.vehicleId).lean().catch(() => null)
        : null;

      companyTripDto = {
        _id: String(runTrip.tripId || activeTripId),
        routeId: String(runTrip.companyRouteId || ""),
        routeName: route?.name || route?.title || "Company Trip",
        title: route?.name || route?.title || "Company Trip",
        name: route?.name || route?.title || "Company Trip",
        status: runTrip.status || "ACCEPTED",
        tripType: TRIP_TYPE.COMPANY,
        type: TRIP_TYPE.COMPANY,
        driverId: String(driver._id),
        vehicleId: String(runTrip.vehicleId || ""),
        vehicle: vehicle
          ? {
              _id: String(vehicle._id),
              vehicleNumber: vehicle.vehicleNumber,
              vehicleModel: vehicle.vehicleModel,
            }
          : null,
        stops: (runDetails.tripStop?.stops || []).map((s) => ({
          locationName: s.locationName || s.name,
          name: s.locationName || s.name,
          stopType: s.stopType,
          sequence: s.sequence,
        })),
      };
    }

    return {
      isTripActive: true,
      activeTripId: String(activeTripId),
      activeTripType: TRIP_TYPE.COMPANY,
      driverId: driver._id,
      tripStatus: driver.tripStatus,
      companyTrip: companyTripDto,
      genericTrip: null,
    };
  } else {
    const genericDetails = await tripService
      .getDriverCurrentTripDetails(userId)
      .catch(() => null);

    return {
      isTripActive: true,
      activeTripId: String(activeTripId),
      activeTripType: TRIP_TYPE.INDEPENDENT,
      driverId: driver._id,
      tripStatus: driver.tripStatus,
      companyTrip: null,
      genericTrip: genericDetails,
    };
  }
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
