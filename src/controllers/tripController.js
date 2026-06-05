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
//  create trip request
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
    console.log(data);
    console.log("userId:", userId);
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
