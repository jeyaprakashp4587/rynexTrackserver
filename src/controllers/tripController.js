import mongoose from "mongoose";
import { Trip } from "../models/trip.js";
import tripRequests from "../models/tripRequests.js";

// create owner trip
export const createTrip = async (req, res) => {
  try {
    const {
      driverId,
      vehicleId,
      pickupCoords: startLocation,
      dropCoords: endLocation,
      pickupText,
      dropText,
    } = req.body;

    const newTrip = new Trip({
      createdBy: req.userId,
      allocatedDriver: driverId,
      allocatedVehicle: vehicleId,
      pickupLocation: pickupText,
      dropLocation: dropText,
      pickupCoords: {
        type: "Point",
        coordinates: [startLocation.lon, startLocation.lat],
      },
      dropCoords: {
        type: "Point",
        coordinates: [endLocation.lon, endLocation.lat],
      },
      // status: "in-transit",
    });
    await newTrip.save();
    res
      .status(201)
      .json({ message: "Trip created successfully", trip: newTrip });
  } catch (error) {
    res.status(500).json({ error: "Failed to create trip" });
  }
};
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
      ownerId,
      driverId,
      vehicleId,
      driverUserId,
    } = data;
    // receipt controller
    const bookingHandlers = {
      COMPANY_TRIP: ownerId,
      INDEPENDENT_TRIP: driverUserId,
    };
    // trip request cretrion
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
      recipients: [
        {
          userId: bookingHandlers[bookingType],
        },
      ],
      requestedData: {
        driverId: driverId,
        vehicleId: vehicleId,
      },
    });
    await newTripRequest.save();
    //
    console.log("trip created");

    res.status(200).json({ message: "Trip requested successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to request trip" });
  }
};
// get request trips
export const getRequestTrips = async (req, res) => {
  try {
    const userId = req.userId;
    // console.log("trip", userId);
    const trips = await tripRequests.aggregate([
      {
        $match: {
          "recipients.userId": new mongoose.Types.ObjectId(userId),
          status: "PENDING",
        },
      },

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
                // profileImage: 1,
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
          from: "drivers",
          localField: "requestedData.driverId",
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
          from: "vehicles",
          localField: "requestedData.vehicleId",
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
          pickupLocation: 1,
          dropLocation: 1,
          createdAt: 1,
          createdBy: 1,
        },
      },
    ]);
    if (!trips || trips.length === 0) {
      console.log("no trip");
      return res.status(404).json({ message: "No trip requests found" });
    }
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ error: "Failed to get trip requests" });
  }
};
// accept trip for  (indi) driver and owner
export const acceptTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    // pass if they change the vehicle or driver
    const { newAllocatedDriver, newAllocatedVehicle } = req.body;
    const userId = req.userId;
    // find the trip request details
    const tripRequest = await tripRequests.findById(tripId);
    // check the trip exist
    if (!tripRequest) {
      return res.status(404).json({ message: "Trip request not found" });
    }
    // Check if the user is authorized to accept the trip
    if (tripRequest.status !== "PENDING") {
      return res.status(400).json({ message: "Trip already created" });
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
    tripRequest.status = "ACCEPTED";
    await tripRequest.save();
    res.status(200).json({ message: "Trip request accepted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept trip request" });
  }
};
