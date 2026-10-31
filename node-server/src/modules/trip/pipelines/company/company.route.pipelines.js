import mongoose from "mongoose";
import {
  EXTERNAL_COLLECTIONS,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { COMPANY_COLLECTIONS } from "../../constants/company/company.constants.js";
import { ROLES } from "../../../../shared/constants/role.js";

export const buildCompanyRoutesListPipeline = (userId) => {
  return [
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        isDailyTrip: true,
      },
    },
    {
      $lookup: {
        from: COMPANY_COLLECTIONS.ROUTE_STOPS,
        localField: "_id",
        foreignField: "routeId",
        as: "stops",
      },
    },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
        localField: "recipients.driverUserId",
        foreignField: "_id",
        as: "receiptDriverUsers",
        pipeline: [
          { $project: { _id: 1, Name: 1, MobileNumber: 1, image: 1 } },
        ],
      },
    },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.DRIVERS,
        localField: "recipients.driverId",
        foreignField: "_id",
        as: "receiptDrivers",
        pipeline: [
          { $project: { _id: 1, name: 1, MobileNumber: 1, image: 1 } },
        ],
      },
    },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.VEHICLES,
        localField: "recipients.vehicleId",
        foreignField: "_id",
        as: "receiptVehicles",
        pipeline: [
          { $project: { _id: 1, vehicleNumber: 1, vehicleModel: 1, image: 1 } },
        ],
      },
    },
    {
      $addFields: {
        recipients: {
          $map: {
            input: "$recipients",
            as: "r",
            in: {
              $mergeObjects: [
                "$$r",
                {
                  driverUser: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptDriverUsers",
                          as: "u",
                          cond: {
                            $eq: [
                              { $toString: { $ifNull: ["$$u._id", ""] } },
                              {
                                $toString: {
                                  $ifNull: ["$$r.driverUserId", ""],
                                },
                              },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                {
                  driver: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptDrivers",
                          as: "d",
                          cond: {
                            $eq: [
                              { $toString: { $ifNull: ["$$d._id", ""] } },
                              { $toString: { $ifNull: ["$$r.driverId", ""] } },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                {
                  vehicle: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptVehicles",
                          as: "v",
                          cond: {
                            $eq: [
                              { $toString: { $ifNull: ["$$v._id", ""] } },
                              { $toString: { $ifNull: ["$$r.vehicleId", ""] } },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ];
};

export const buildCompanyActiveTripsPipeline = (userId) => {
  return [
    {
      $match: {
        status: TRIP_STATUS.ACCEPTED,
        "recipients.assignedBy": new mongoose.Types.ObjectId(userId),
        // "recipients.status": TRIP_STATUS.ACCEPTED,
        isTripEnded: false,
      },
    },
    {
      $lookup: {
        from: COMPANY_COLLECTIONS.RUN_STOPS,
        localField: "_id",
        foreignField: "runId",
        as: "stops",
      },
    },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
        localField: "recipients.userId",
        foreignField: "_id",
        as: "users",
      },
    },
    {
      // 6a2095e54604abd9538046df
      $project: {
        _id: 1,
        tripRequestId: 1,
        createdBy: 1,
        status: 1,
        tripStopMode: 1,
        stops: 1,
        users: {
          $map: {
            input: "$users",
            as: "user",
            in: {
              _id: "$$user._id",
              Name: "$$user.Name",
              MobileNumber: "$$user.MobileNumber",
              currentStopIndex: {
                $let: {
                  vars: {
                    recipient: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$recipients",
                            as: "recipient",
                            cond: {
                              $eq: ["$$recipient.userId", "$$user._id"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: "$$recipient.currentStopIndex",
                },
              },
            },
          },
        },
      },
    },
  ];
};

export const buildCompanyTripDetailPipeline = (tripId, userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    { $match: { _id: new mongoose.Types.ObjectId(tripId) } },
    // stops
    {
      $lookup: {
        from: COMPANY_COLLECTIONS.RUN_STOPS,
        localField: "_id",
        foreignField: "runId",
        as: "stops",
      },
    },
    { $unwind: "$stops" },
    //   // just the role, nothing else - this is only for the branch decision below
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
        let: { uid: userObjectId },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
          { $project: { role: 1 } },
        ],
        as: "requestingUser",
      },
    },
    //   // enrich every recipient - works whether caller is a recipient or not
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
        localField: "recipients.userId",
        foreignField: "_id",
        as: "receiptUsers",
        pipeline: [{ $project: { Name: 1 } }],
      },
    },
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.DRIVERS,
        localField: "recipients.driverId",
        foreignField: "_id",
        as: "receiptDrivers",
        pipeline: [{ $project: { name: 1, image: 1, MobileNumber: 1 } }],
      },
    },
    //   {
    //     $lookup: {
    //       from: EXTERNAL_COLLECTIONS.VEHICLES,
    //       localField: "recipients.vehicleId",
    //       foreignField: "_id",
    //       as: "receiptVehicles",
    //       pipeline: [{ $project: { vehicleNumber: 1, vehicleModel: 1 } }],
    //     },
    //   },
    //   // merge objects
    {
      $addFields: {
        enrichedReceipts: {
          $map: {
            input: "$recipients",
            as: "r",
            in: {
              $mergeObjects: [
                "$$r",
                {
                  user: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptUsers",
                          as: "u",
                          cond: {
                            $eq: [
                              { $toString: "$$u._id" },
                              { $toString: "$$r.userId" },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                {
                  driver: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptDrivers",
                          as: "d",
                          cond: {
                            $eq: [
                              { $toString: "$$d._id" },
                              { $toString: "$$r.driverId" },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                {
                  vehicle: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$receiptVehicles",
                          as: "v",
                          cond: {
                            $eq: [
                              { $toString: "$$v._id" },
                              { $toString: "$$r.vehicleId" },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
        requestingUserRole: { $arrayElemAt: ["$requestingUser.role", 0] },
      },
    },

    {
      $addFields: {
        users: {
          $cond: [
            { $eq: ["$requestingUserRole", ROLES.DRIVER] },
            {
              $filter: {
                input: "$enrichedReceipts",
                as: "r",
                cond: {
                  $eq: [{ $toString: "$$r.userId" }, userId.toString()],
                },
              },
            },
            "$enrichedReceipts",
          ],
        },
      },
    },

    {
      $project: {
        recipients: 0,
        receiptUsers: 0,
        receiptDrivers: 0,
        receiptVehicles: 0,
        enrichedReceipts: 0,
        requestingUser: 0,
        requestingUserRole: 0,
      },
    },
  ];
};
