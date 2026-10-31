import mongoose from "mongoose";

import {
  EXTERNAL_COLLECTIONS,
  REQUEST_OPEN_STATUSES,
  TRIP_COLLECTIONS,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { ROLES } from "../../../../shared/constants/role.js";

export const buildTripRequestListPipeline = (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return [
    {
      $match: {
        status: { $in: REQUEST_OPEN_STATUSES },
        $or: [
          {
            recipients: {
              $elemMatch: {
                userId: userObjectId,
                status: TRIP_STATUS.PENDING,
              },
            },
          },

          {
            createdBy: userObjectId,
            recipients: {
              $elemMatch: {
                status: TRIP_STATUS.PENDING,
              },
            },
          },
        ],
      },
    },

    {
      $lookup: {
        from: TRIP_COLLECTIONS.TRIP_STOPS,
        localField: "_id",
        foreignField: "tripRequestId",
        as: "tripStops",
      },
    },

    {
      $unwind: "$tripStops",
    },

    {
      $addFields: {
        currentRecipient: {
          $let: {
            vars: {
              userPendingRecipient: {
                $filter: {
                  input: "$recipients",
                  as: "recipient",
                  cond: {
                    $and: [
                      {
                        $eq: ["$$recipient.userId", userObjectId],
                      },
                      {
                        $eq: ["$$recipient.status", TRIP_STATUS.PENDING],
                      },
                    ],
                  },
                },
              },
            },

            in: {
              $cond: [
                {
                  $gt: [{ $size: "$$userPendingRecipient" }, 0],
                },

                "$$userPendingRecipient",

                {
                  $filter: {
                    input: "$recipients",
                    as: "recipient",
                    cond: {
                      $eq: ["$$recipient.status", TRIP_STATUS.PENDING],
                    },
                  },
                },
              ],
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

    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
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

    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.DRIVERS,
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

    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.VEHICLES,
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

    {
      $project: {
        _id: 1,
        createdAt: 1,

        createdBy: 1,

        tripType: 1,
        tripStopMode: 1,
        vehiclesRequired: 1,
        acceptedCount: 1,

        stops: "$tripStops",

        status: 1,

        currentRecipient: 1,

        driver: 1,

        vehicle: 1,
      },
    },
  ];
};

export const buildTripRequestDetailPipeline = (tripId, userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    { $match: { _id: new mongoose.Types.ObjectId(tripId) } },
    {
      $lookup: {
        from: TRIP_COLLECTIONS.TRIP_STOPS,
        localField: "_id",
        foreignField: "tripRequestId",
        as: "stops",
      },
    },
    {
      $unwind: "$stops",
    },
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
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.VEHICLES,
        localField: "recipients.vehicleId",
        foreignField: "_id",
        as: "receiptVehicles",
        pipeline: [{ $project: { vehicleNumber: 1, vehicleModel: 1 } }],
      },
    },
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

export const buildDriverCurrentTripPipeline = (recipientId) => {
  return [
    // Find accepted trip
    {
      $match: {
        status: TRIP_STATUS.ACCEPTED,
        isTripEnded: { $ne: true },
      },
    },

    // Split recipients array
    {
      $unwind: "$recipients",
    },

    // Filter only matched recipient
    {
      $match: {
        "recipients.userId": new mongoose.Types.ObjectId(recipientId),
        "recipients.status": TRIP_STATUS.ACCEPTED,
      },
    },

    // USER LOOKUP
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.USERS,
        localField: "recipients.userId",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },

    // DRIVER LOOKUP
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.DRIVERS,
        localField: "recipients.driverId",
        foreignField: "_id",
        as: "driver",
      },
    },

    {
      $unwind: {
        path: "$driver",
        preserveNullAndEmptyArrays: true,
      },
    },

    // VEHICLE LOOKUP
    {
      $lookup: {
        from: EXTERNAL_COLLECTIONS.VEHICLES,
        localField: "recipients.vehicleId",
        foreignField: "_id",
        as: "vehicle",
      },
    },

    {
      $unwind: {
        path: "$vehicle",
        preserveNullAndEmptyArrays: true,
      },
    },

    // GROUP BACK TO SINGLE TRIP
    {
      $group: {
        _id: "$_id",

        tripRequestId: {
          $first: "$tripRequestId",
        },

        createdBy: {
          $first: "$createdBy",
        },

        status: {
          $first: "$status",
        },

        tripStopMode: {
          $first: "$tripStopMode",
        },

        users: {
          $push: {
            recipientId: "$recipients._id",
            status: "$recipients.status",
            currentStopIndex: "$recipients.currentStopIndex",
            user: {
              _id: "$user._id",
              Name: "$user.Name",
              MobileNumber: "$user.MobileNumber",
            },

            driver: {
              _id: "$driver._id",
              name: "$driver.name",
            },

            vehicle: {
              _id: "$vehicle._id",
              vehicleNumber: "$vehicle.vehicleNumber",
              vehicleModel: "$vehicle.vehicleModel",
            },
          },
        },
      },
    },

    // Optional clean response
    {
      $project: {
        _id: 1,
        tripRequestId: 1,
        createdBy: 1,
        status: 1,
        tripStopMode: 1,
        users: 1,
      },
    },
  ];
};

export const buildRecipientStopsPipeline = (tripId, recipientId) => {
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
