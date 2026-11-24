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
import { TRIP_TYPE, TRIP_STATUS } from "../../trip/constants/shared/trip.constants.js";
import * as companyRunService from "../../trip/services/company/company.run.services.js";
import * as tripService from "../../trip/services/generic/trip.services.js";
import { companyRoutes } from "../../trip/models/company/companyRoute.model.js";
import { companyRun } from "../../trip/models/company/companyRun.model.js";
import { companyRunStops } from "../../trip/models/company/companyRunStops.model.js";
import { trip as genericTripModel } from "../../trip/models/generic/trip.model.js";
import { Vehicle } from "../../vehicle/models/vehicle.model.js";
import { Driver } from "../models/driver.model.js";
import { redisService } from "../../../Redis/redis.service.js";
import { driverCacheKeys } from "../cache/cacheKeys.js";

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
  const driver = await Driver.findOne({ driverUserId: userId }).lean();
  if (!driver) {
    throw new Error("Driver not found");
  }

  const RUNNING_STATUSES = [
    TRIP_STATUS.ACCEPTED,
    TRIP_STATUS.STARTED,
    "STARTED",
    "ACCEPTED",
    "IN_PROGRESS",
  ];

  // 1. Check for active company run with started / accepted status and not ended (driver only)
  const activeCompanyRun = await companyRun
    .findOne({
      $or: [
        { activeDriverUserId: userId },
        ...(driver.activeTrip?.activeTripId
          ? [
              {
                _id: driver.activeTrip.activeTripId,
                activeDriverUserId: userId,
              },
            ]
          : []),
      ],
      isTripEnded: false,
      status: { $in: RUNNING_STATUSES },
    })
    .lean();

  if (activeCompanyRun) {
    const route = activeCompanyRun.companyRouteId
      ? await companyRoutes
          .findById(activeCompanyRun.companyRouteId)
          .lean()
          .catch(() => null)
      : null;
    const vehicle = activeCompanyRun.activeVehicleId
      ? await Vehicle.findById(activeCompanyRun.activeVehicleId)
          .lean()
          .catch(() => null)
      : null;
    const runStops = await companyRunStops
      .findOne({ runId: activeCompanyRun._id })
      .lean()
      .catch(() => null);

    const companyTripDto = {
      _id: String(activeCompanyRun._id),
      routeId: String(activeCompanyRun.companyRouteId || ""),
      routeName: route?.name || route?.title || "Company Trip",
      title: route?.name || route?.title || "Company Trip",
      name: route?.name || route?.title || "Company Trip",
      status: activeCompanyRun.status || TRIP_STATUS.ACCEPTED,
      tripType: TRIP_TYPE.COMPANY,
      type: TRIP_TYPE.COMPANY,
      driverId: String(driver._id),
      vehicleId: String(activeCompanyRun.activeVehicleId || ""),
      vehicle: vehicle
        ? {
            _id: String(vehicle._id),
            vehicleNumber: vehicle.vehicleNumber,
            vehicleModel: vehicle.vehicleModel,
          }
        : null,
      stops: (runStops?.stops || []).map((s) => ({
        locationName: s.locationName || s.name,
        name: s.locationName || s.name,
        stopType: s.stopType,
        sequence: s.sequence,
      })),
    };

    if (
      String(driver.activeTrip?.activeTripId) !==
        String(activeCompanyRun._id) ||
      driver.tripStatus !== DRIVER_TRIP_STATUS.ON_TRIP
    ) {
      await repoUpdateDriverActiveTrip({
        userId,
        driverId: driver._id,
        activeTripId: activeCompanyRun._id,
        activeTripType: TRIP_TYPE.COMPANY,
        tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
        availability: DRIVER_AVAILABILITY.UNAVAILABLE,
      });
    }

    return {
      isTripActive: true,
      activeTripId: String(activeCompanyRun._id),
      activeTripType: TRIP_TYPE.COMPANY,
      driverId: driver._id,
      vehicleId: String(activeCompanyRun.activeVehicleId || ""),
      tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
      companyTrip: companyTripDto,
      genericTrip: null,
    };
  }

  // 2. Check for active generic trip with started / accepted status and not ended (driver only)
  const activeGenericTrip = await genericTripModel
    .findOne({
      $or: [
        { "recipients.userId": userId },
        ...(driver.activeTrip?.activeTripId
          ? [
              {
                _id: driver.activeTrip.activeTripId,
                "recipients.userId": userId,
              },
            ]
          : []),
      ],
      isTripEnded: { $ne: true },
      status: { $in: RUNNING_STATUSES },
      recipients: {
        $elemMatch: {
          userId,
          status: { $in: RUNNING_STATUSES },
        },
      },
    })
    .lean();

  if (activeGenericTrip) {
    if (
      String(driver.activeTrip?.activeTripId) !==
        String(activeGenericTrip._id) ||
      driver.tripStatus !== DRIVER_TRIP_STATUS.ON_TRIP
    ) {
      await repoUpdateDriverActiveTrip({
        userId,
        driverId: driver._id,
        activeTripId: activeGenericTrip._id,
        activeTripType: TRIP_TYPE.INDEPENDENT,
        tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
        availability: DRIVER_AVAILABILITY.UNAVAILABLE,
      });
    }

    return {
      isTripActive: true,
      activeTripId: String(activeGenericTrip._id),
      activeTripType: TRIP_TYPE.INDEPENDENT,
      driverId: driver._id,
      vehicleId: null,
      tripStatus: DRIVER_TRIP_STATUS.ON_TRIP,
      companyTrip: null,
      genericTrip: activeGenericTrip,
    };
  }

  // 3. Neither company run nor generic trip is active in DB!
  // Self-heal stale driver document and Redis cache if needed
  if (
    driver.activeTrip?.activeTripId ||
    driver.tripStatus === DRIVER_TRIP_STATUS.ON_TRIP
  ) {
    await repoUpdateDriverActiveTrip({
      userId,
      driverId: driver._id,
      activeTripId: null,
      activeTripType: null,
      tripStatus: DRIVER_TRIP_STATUS.IDLE,
      availability: DRIVER_AVAILABILITY.AVAILABLE,
    });
    await redisService
      .del(driverCacheKeys.DRIVER.BY_USER_ID(userId))
      .catch(() => {});
    await redisService
      .del(driverCacheKeys.DRIVER.BY_ID(driver._id))
      .catch(() => {});
  }

  return {
    isTripActive: false,
    activeTripId: null,
    activeTripType: null,
    driverId: driver._id,
    vehicleId: null,
    tripStatus: DRIVER_TRIP_STATUS.IDLE,
    companyTrip: null,
    genericTrip: null,
  };
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
