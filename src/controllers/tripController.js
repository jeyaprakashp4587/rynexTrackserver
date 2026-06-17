import mongoose from "mongoose";
import { trip } from "../models/trip.js";
import tripRequests from "../models/tripRequests.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { formatRecipients } from "../utils/formatters.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/statusConst.js";
import { formatTripStop } from "../utils/formatTripStop.js";
import { TripStops } from "../models/tripStop.js";

export const requestTrip = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { data } = req.body;
    const userId = req.userId;
    const { tripMode, bookingType, recipients, stops } = data;
    // format recipients
    const formattedRecipients = formatRecipients(recipients, userId);
    // create trip request
    const newTripRequest = await tripRequests.create(
      [
        {
          createdBy: userId,
          tripType: bookingType,
          tripMode: tripMode,
          recipients: formattedRecipients,
          status: TRIP_STATUS.PENDING,
        },
      ],
      { session }
    );
    // format stops
    const formattedStops = formatTripStop(stops);
    // create trip stops
    await TripStops.create(
      [
        {
          tripRequestId: newTripRequest[0]._id,

          stops: formattedStops,
        },
      ],
      { session }
    );
    // commit all DB operations
    await session.commitTransaction();
    session.endSession();
    successResponse(res, 200, "Trip requested successfully");
  } catch (error) {
    // rollback all changes
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    errorResponse(res, 500, "Failed to request trip");
  }
};
// get request trips
export const getRequestTrips = async (req, res) => {
  try {
    const userId = req.userId;
    const trips = await tripRequests.aggregate([
      {
        $match: {
          "recipients.userId": new mongoose.Types.ObjectId(userId),
          "recipients.status": TRIP_STATUS.PENDING,
        },
      },
      // get only current recipient and drivers or owner
      {
        $addFields: {
          currentRecipient: {
            $filter: {
              input: "$recipients",
              as: "recipient",
              cond: {
                $eq: [
                  "$$recipient.userId",
                  new mongoose.Types.ObjectId(userId),
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

      // creator lookup
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

      // driver lookup
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

      // vehicle lookup
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
          pickupLocation: 1,
          dropLocation: 1,
          pickupCoords: 1,
          dropCoords: 1,

          createdAt: 1,

          createdBy: 1,

          driver: 1,
          vehicle: 1,

          currentRecipient: 1,

          type: 1,
          status: 1,
        },
      },
    ]);

    if (!trips || trips.length === 0) {
      return res.status(404).json({
        message: "No trip requests found",
      });
    }
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get trip requests",
    });
  }
};
// get particular request trip details
export const getParticularRequestedTripDetails = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.userId;
    // validate trip id
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return errorResponse(res, "Invalid trip id");
    }
    const trip = await tripRequests.aggregate(
      [
        // match trip
        {
          $match: {
            _id: new mongoose.Types.ObjectId(tripId),
          },
        },
        // filter only current user receipts
        {
          $addFields: {
            currentUserReceipts: {
              $filter: {
                input: "$recipients",
                as: "receipt",
                cond: {
                  $eq: [{ $toString: "$$receipt.userId" }, userId.toString()],
                },
              },
            },
          },
        },
        // lookup users
        {
          $lookup: {
            from: "users",
            localField: "currentUserReceipts.userId",
            foreignField: "_id",
            as: "receiptUsers",
            pipeline: [
              {
                $project: {
                  Name: 1,
                },
              },
            ],
          },
        },
        // lookup drivers
        {
          $lookup: {
            from: "drivers",
            localField: "currentUserReceipts.driverId",
            foreignField: "_id",
            as: "receiptDrivers",
            pipeline: [
              {
                $project: {
                  name: 1,
                  image: 1,
                  MobileNumber: 1,
                },
              },
            ],
          },
        },
        // lookup vehicles
        {
          $lookup: {
            from: "vehicles",
            localField: "currentUserReceipts.vehicleId",
            foreignField: "_id",
            as: "receiptVehicles",
            pipeline: [
              {
                $project: {
                  vehicleNumber: 1,
                  vehicleModel: 1,
                },
              },
            ],
          },
        },
        // look up trips stop details
        // merge user/driver/vehicle into receipt
        {
          $addFields: {
            currentUserReceipts: {
              $map: {
                input: "$currentUserReceipts",
                as: "receipt",
                in: {
                  $mergeObjects: [
                    "$$receipt",

                    // user
                    {
                      user: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$receiptUsers",
                              as: "user",
                              cond: {
                                $eq: [
                                  { $toString: "$$user._id" },
                                  { $toString: "$$receipt.userId" },
                                ],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },

                    // driver
                    {
                      driver: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$receiptDrivers",
                              as: "driver",
                              cond: {
                                $eq: [
                                  { $toString: "$$driver._id" },
                                  { $toString: "$$receipt.driverId" },
                                ],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },

                    // vehicle
                    {
                      vehicle: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$receiptVehicles",
                              as: "vehicle",
                              cond: {
                                $eq: [
                                  { $toString: "$$vehicle._id" },
                                  { $toString: "$$receipt.vehicleId" },
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
        // remove unnecessary arrays
        {
          $project: {
            receiptUsers: 0,
            receiptDrivers: 0,
            receiptVehicles: 0,
          },
        },
      ],
      0
    );
    successResponse(res, trip[0]);
  } catch (error) {
    console.log(error);
    errorResponse(res, "Failed to get trip details");
  }
};
// accept trip for  (indi) driver and owner its will create request to trip
export const acceptTrip = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { recipients, tripId } = req.body;
    const userId = req.userId;
    let formattedRecipients = [];
    // company owner reassigning driver/vehicle
    if (recipients?.length) {
      formattedRecipients = formatRecipients(recipients, userId);
    }
    // find request safely
    const tripRequest = await tripRequests.findById(tripId).session(session);
    if (!tripRequest) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, "Trip request not found", 404);
    }
    // COMPANY FLOW owner assigns to driver

    if (tripRequest.type === TRIP_TYPE.COMPANY) {
      await tripRequests.updateOne(
        {
          _id: tripId,
        },
        {
          $set: {
            recipients: formattedRecipients,
            type: TRIP_TYPE.INDEPENDENT,
          },
        },
        {
          session,
        }
      );

      await session.commitTransaction();
      session.endSession();
      return successResponse(res, "Trip assigned to driver successfully");
    }

    // prevent duplicate accepts

    const updatedTripRequest = await tripRequests.findOneAndUpdate(
      {
        _id: tripId,
        status: TRIP_STATUS.PENDING,
      },
      {
        $set: {
          status: TRIP_STATUS.ACCEPTED,
        },
      },
      {
        new: true,
        session,
      }
    );

    if (!updatedTripRequest) {
      await session.abortTransaction();

      session.endSession();

      return errorResponse(res, "Trip already accepted or unavailable", 400);
    }

    /**
     * find matched recipient
     */
    const matchedRecipient = updatedTripRequest.recipients.find((recipient) =>
      recipient.userId.equals(userId)
    );

    if (!matchedRecipient) {
      await session.abortTransaction();

      session.endSession();

      return errorResponse(res, "Unauthorized trip access", 403);
    }

    // create actual trip
    const newTrip = new trip({
      tripRequestId: updatedTripRequest._id,

      createdBy: updatedTripRequest.createdBy,

      allocatedDriver: matchedRecipient.driverId,

      allocatedVehicle: matchedRecipient.vehicleId,

      status: TRIP_STATUS.ACCEPTED,

      currentStopIndex: 1,
    });

    await newTrip.save({ session });

    // attach tripId into TripStops

    await TripStops.updateOne(
      {
        tripRequestId: updatedTripRequest._id,
      },
      {
        $set: {
          tripId: newTrip._id,
        },
      },
      {
        session,
      }
    );

    // update recipient status
    await tripRequests.updateOne(
      {
        _id: updatedTripRequest._id,
        "recipients.userId": userId,
      },
      {
        $set: {
          "recipients.$.status": TRIP_STATUS.ACCEPTED,
        },
      },
      {
        session,
      }
    );

    // commit everythings
    await session.commitTransaction();
    session.endSession();

    return successResponse(res, "Trip accepted successfully");
  } catch (error) {
    console.log(error);

    await session.abortTransaction();

    session.endSession();

    return errorResponse(res, "Failed to accept trip request", 500);
  }
};
