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
    const trip = await tripRequests.findById(tripId);
    if (!trip) {
      errorResponse(res, "Trip not found", 404);
      return;
    }
    successResponse(res, trip);
  } catch (error) {
    errorResponse(res, "Failed to get trip details");
  }
};
// accept trip for  (indi) driver and owner its will create request to trip
export const acceptTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    // pass if they change the vehicle or driver
    const { recipients } = req.body;
    const userId = req.userId;
    const formattedRecipients = formatRecipients(recipients, userId);
    // find the trip request details
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
    }
    // check the trip exist
    if (!tripRequest) {
      return errorResponse(res, "Trip request not found", 404);
    }
    // Check if the user is authorized to accept the trip
    if (tripRequest.status !== TRIP_STATUS.PENDING) {
      return errorResponse(res, "Trip already created", 400);
    }
    const newTrip = new Trip({
      tripRequestId: tripRequest._id,
      pickupCoords: tripRequest.pickupCoords,
      dropCoords: tripRequest.dropCoords,
      pickupLocation: tripRequest.pickupLocation,
      dropLocation: tripRequest.dropLocation,
      createdBy: tripRequest.createdBy,
      // customer: userId,
      allocatedDriver: newAllocatedDriver || tripRequest.requestedData.driverId,
      allocatedVehicle:
        newAllocatedVehicle || tripRequest.requestedData.vehicleId,
    });
    // Update the trip request status
    tripRequest.status = TRIP_STATUS.ACCEPTED;
    await tripRequest.save();
    successResponse(res, "Trip request accepted successfully");
  } catch (error) {
    errorResponse(res, "Failed to accept trip request");
  }
};
