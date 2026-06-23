// trip.aggregate.js
import mongoose from "mongoose";

import { TRIP_STATUS } from "../constants/trip.constants.js";
import { ROLES } from "../../../shared/constants/role.js";

export const getRequestTripsPipeline = (userId) => {
  return [
    {
      $match: {
        "recipients.userId": new mongoose.Types.ObjectId(userId),
        "recipients.status": TRIP_STATUS.PENDING,
      },
    },

    // trip stops
    {
      $lookup: {
        from: "tripstops",
        localField: "_id",
        foreignField: "tripRequestId",
        as: "tripStops",
      },
    },

    {
      $unwind: "$tripStops",
    },

    // current recipient
    {
      $addFields: {
        currentRecipient: {
          $filter: {
            input: "$recipients",
            as: "recipient",
            cond: {
              $eq: ["$$recipient.userId", new mongoose.Types.ObjectId(userId)],
            },
          },
        },
      },
    },

    {
      $unwind: {
        path: "$currentRecipient",
        preserveNullAndEmptyArrays: true,
      },
    },

    // creator
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              Name: 1,
              MobileNumber: 1,
            },
          },
        ],
        as: "createdBy",
      },
    },

    {
      $unwind: {
        path: "$createdBy",
        preserveNullAndEmptyArrays: true,
      },
    },

    // driver
    {
      $lookup: {
        from: "drivers",
        localField: "currentRecipient.driverId",

        foreignField: "_id",

        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              phone: 1,
              currentLocation: 1,
            },
          },
        ],

        as: "driver",
      },
    },

    {
      $unwind: {
        path: "$driver",
        preserveNullAndEmptyArrays: true,
      },
    },

    // vehicle
    {
      $lookup: {
        from: "vehicles",

        localField: "currentRecipient.vehicleId",

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

    {
      $unwind: {
        path: "$vehicle",
        preserveNullAndEmptyArrays: true,
      },
    },

    // final response
    {
      $project: {
        _id: 1,
        createdAt: 1,
        createdBy: 1,
        // driver: 1,
        // vehicle: 1,
        // currentRecipient: 1,
        tripType: 1,
        tripMode: 1,
        stops: "$tripStops",
        status: 1,
      },
    },
  ];
};

export const getParticularTripPipeline = (tripId, userId) => {
  // console.log("trip id from pipeline", tripId, userId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return [
    { $match: { _id: new mongoose.Types.ObjectId(tripId) } },

    // stops
    {
      $lookup: {
        from: "tripstops",
        localField: "_id",
        foreignField: "tripRequestId",
        as: "stops",
      },
    },
    { $unwind: "$stops" },
    // just the role, nothing else - this is only for the branch decision below
    {
      $lookup: {
        from: "users",
        let: { uid: userObjectId },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
          { $project: { role: 1 } },
        ],
        as: "requestingUser",
      },
    },
    // enrich every recipient - works whether caller is a recipient or not
    {
      $lookup: {
        from: "users",
        localField: "recipients.userId",
        foreignField: "_id",
        as: "receiptUsers",
        pipeline: [{ $project: { Name: 1 } }],
      },
    },
    {
      $lookup: {
        from: "drivers",
        localField: "recipients.driverId",
        foreignField: "_id",
        as: "receiptDrivers",
        pipeline: [{ $project: { name: 1, image: 1, MobileNumber: 1 } }],
      },
    },
    {
      $lookup: {
        from: "vehicles",
        localField: "recipients.vehicleId",
        foreignField: "_id",
        as: "receiptVehicles",
        pipeline: [{ $project: { vehicleNumber: 1, vehicleModel: 1 } }],
      },
    },
    // merge objects
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

    // driver -> only their own receipt. anyone else (owner/admin) -> everyone's
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

// get accept driver current trip detsil (driver only)
export const getStopsByRecipientIdPipeLine = (tripId, recipientId) => {
  return [
    {
      $match: {
        tripId: new mongoose.Types.ObjectId(tripId),
      },
    },
    // filter stops
    {
      $project: {
        tripId: 1,
        tripRequestId: 1,

        stops: {
          $map: {
            input: {
              $filter: {
                input: "$stops",
                as: "stop",
                cond: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$$stop.recipientsMeta",
                          as: "meta",
                          cond: {
                            $eq: [
                              "$$meta.recipientId",
                              new mongoose.Types.ObjectId(recipientId),
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },

            as: "stop",

            in: {
              _id: "$$stop._id",
              sequence: "$$stop.sequence",
              stopType: "$$stop.stopType",
              locationName: "$$stop.locationName",
              coords: "$$stop.coords",

              recipientsMeta: {
                $filter: {
                  input: "$$stop.recipientsMeta",
                  as: "meta",
                  cond: {
                    $eq: [
                      "$$meta.recipientId",
                      new mongoose.Types.ObjectId(recipientId),
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  ];
};
