import mongoose from "mongoose";
import { Trip } from "../models/trip.js";
import tripRequests from "../models/tripRequests.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { formatRecipients } from "../utils/formatters.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/statusConst.js";

// get trips for company jjbh vhbhv
export const getMyCompanyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ createdBy: req.user._id })
      .populate("allocatedDriver", "name")
      .populate("allocatedVehicle", "vehicleNumber");
    res.status(200).json({ trips });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};
// start allocated trip for driver
export const startTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    if (trip.allocatedDriver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    trip.status = "started";
    await trip.save();
    res.status(200).json({ message: "Trip started successfully", trip });
  } catch (error) {
    res.status(500).json({ error: "Failed to start trip" });
  }
};
// get allocated trip for drivers
export const getMyTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ allocatedDriver: req.user._id });
    res.status(200).json({ trip });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trip" });
  }
};
// complete trip3
export const completeTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { photoProofUrl } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    if (trip.allocatedDriver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    trip.status = "completed";
    trip.isTripEnded = true;
    trip.photoProofUrl = photoProofUrl;
    await trip.save();
    res.status(200).json({ message: "Trip completed successfully", trip });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete trip" });
  }
};
//  create trip request for both user and owner
export const requestTrip = async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.userId;
    const {
      pickupCoords,
      dropCoords,
      pickupText,
      dropText,
      bookingType,
      recipients,
    } = data;
    console.log(userId, pickupCoords, dropCoords, recipients);

    const formattedRecipients = formatRecipients(recipients, userId);

    const newTripRequest = new tripRequests({
      createdBy: userId,
      pickupLocation: pickupText,
      dropLocation: dropText,
      pickupCoords: {
        type: "Point",
        coordinates: [pickupCoords.lon, pickupCoords.lat],
      },
      dropCoords: {
        type: "Point",
        coordinates: [dropCoords.lon, dropCoords.lat],
      },
      type: bookingType,
      recipients: formattedRecipients,
      status: "PENDING",
    });

    await newTripRequest.save();
    successResponse(res, 200, "Trip requested successfully");
  } catch (error) {
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
    // console.log("requested trip", trips);

    res.status(200).json(trips);
  } catch (error) {
    console.log(error);

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
  try {
    // pass if they change the vehicle or driver
    const { recipients, tripId } = req.body;
    console.log("trip", tripId, recipients);
    // return;
    const userId = req.userId;
    let formattedRecipients;
    if (recipients) {
      formattedRecipients = formatRecipients(recipients, userId);
    }
    const tripRequest = await tripRequests.findById(tripId);
    // check type and create another request for company owner to driver, thia line owner asign to driver, using compant rtip and chett reuest to indivudual
    if (tripRequest.type === TRIP_TYPE.COMPANY) {
      // create a new trip request for the driver
      await tripRequests.updateOne(
        { _id: tripId },
        {
          $set: {
            recipients: formattedRecipients,
            type: TRIP_TYPE.INDEPENDENT,
          },
        }
      );
      return;
    }
    // check the trip exist
    if (!tripRequest) {
      return errorResponse(res, "Trip request not found", 404);
    }
    console.log("passsed trip checkS");

    // Check if the user is authorized to accept the trip
    if (tripRequest.status !== TRIP_STATUS.PENDING) {
      return errorResponse(res, "Trip already created", 400);
    }
    console.log("recipients", tripRequest.recipients);
    console.log("user id", userId);

    // find matched recipients (te find that recipient driver vehicl and driver id)
    const matchedRecipient = tripRequest.recipients.find((recipient) =>
      recipient.userId.equals(userId)
    );
    console.log("passed mathc rep", matchedRecipient);

    const newTrip = new Trip({
      tripRequestId: tripRequest._id,
      pickupCoords: tripRequest.pickupCoords,
      dropCoords: tripRequest.dropCoords,
      pickupLocation: tripRequest.pickupLocation,
      dropLocation: tripRequest.dropLocation,
      createdBy: tripRequest.createdBy,
      // update the receipts if assigned driver changed or vehicle
      allocatedDriver: matchedRecipient.driverId,
      allocatedVehicle: matchedRecipient.vehicleId,
    });
    // Update the trip request status
    tripRequest.status = TRIP_STATUS.ACCEPTED;
    await tripRequest.save();
    await newTrip.save();
    successResponse(res, "Trip request accepted successfully");
  } catch (error) {
    errorResponse(res, "Failed to accept trip request");
  }
};
