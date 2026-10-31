import mongoose from "mongoose";
import {
  STANDING_ASSIGNMENT_INACTIVE_STATUSES,
  TRIP_COLLECTIONS,
} from "../constants/trip.constants.js";

export const buildDriverCompanyRoutesPipeline = (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const isMyAssignment = {
    $and: [
      {
        $eq: [{ $ifNull: ["$$r.driverUserId", "$$r.userId"] }, userObjectId],
      },
      { $not: [{ $in: ["$$r.status", STANDING_ASSIGNMENT_INACTIVE_STATUSES] }] },
    ],
  };

  return [
    {
      $match: {
        recipients: {
          $elemMatch: {
            $or: [
              { driverUserId: userObjectId },
              { driverUserId: null, userId: userObjectId },
            ],
            status: { $nin: STANDING_ASSIGNMENT_INACTIVE_STATUSES },
          },
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
        from: "vehicles",
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
        from: TRIP_COLLECTIONS.TRIP_STOPS,
        localField: "_id",
        foreignField: "companyTripId",
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
        from: TRIP_COLLECTIONS.TRIPS,
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
