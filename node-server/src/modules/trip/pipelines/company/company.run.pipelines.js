import mongoose from "mongoose";
import { EXTERNAL_COLLECTIONS } from "../../constants/shared/trip.constants.js";
import {
  COMPANY_COLLECTIONS,
  STANDING_ASSIGNMENT_INACTIVE_STATUSES,
} from "../../constants/company/company.constants.js";

export const buildDriverCompanyRoutesPipeline = (userId, vehicleId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const vehicleObjectId = vehicleId
    ? new mongoose.Types.ObjectId(vehicleId)
    : null;

  const isMyAssignment = {
    $and: [
      {
        $eq: [{ $ifNull: ["$$r.driverUserId", "$$r.userId"] }, userObjectId],
      },
      {
        $not: [{ $in: ["$$r.status", STANDING_ASSIGNMENT_INACTIVE_STATUSES] }],
      },
    ],
  };

  const recipientFilter = {
    $or: [
      { driverUserId: userObjectId },
      { driverUserId: null, userId: userObjectId },
    ],
    status: { $nin: STANDING_ASSIGNMENT_INACTIVE_STATUSES },
    ...(vehicleObjectId ? { vehicleId: vehicleObjectId } : {}),
  };

  return [
    {
      $match: {
        recipients: {
          $elemMatch: recipientFilter,
        },
      },
    },
    {
      $addFields: {
        mine: {
          $filter: { input: "$recipients", as: "r", cond: isMyAssignment },
        },
      },
    },
    { $unwind: "$mine" },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.VEHICLES,
        localField: "mine.vehicleId",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              vehicleNumber: 1,
              vehicleModel: 1,
              vehicleImage: 1,
            },
          },
        ],
        as: "vehicle",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: COMPANY_COLLECTIONS.ROUTE_STOPS,
        localField: "_id",
        foreignField: "routeId",
        pipeline: [
          { $unwind: "$stops" },
          { $sort: { "stops.sequence": 1 } },
          {
            $project: {
              _id: 0,
              sequence: "$stops.sequence",
              stopType: "$stops.stopType",
              locationName: "$stops.locationName",
            },
          },
        ],
        as: "stops",
      },
    },
    {
      $lookup: {
        from: COMPANY_COLLECTIONS.RUNS,
        let: { routeId: "$_id", vehicleId: "$mine.vehicleId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$companyRouteId", "$$routeId"] },
                  { $eq: ["$activeVehicleId", "$$vehicleId"] },
                  { $eq: ["$isTripEnded", false] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1, activeDriverUserId: 1 } },
        ],
        as: "openTrip",
      },
    },
    {
      $project: {
        _id: 1,
        routeId: "$_id",
        tripStopMode: 1,
        isDailyTrip: 1,
        driverId: "$mine.driverId",
        vehicleId: "$mine.vehicleId",
        vehicle: 1,
        stops: 1,
        openTrip: { $arrayElemAt: ["$openTrip", 0] },
      },
    },
    { $sort: { _id: 1 } },
  ];
};
