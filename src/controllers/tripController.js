import { Trip } from "../models/trip";

export const createTrip = async (req, res) => {
  try {
    const { driverId, vehicleId, startLocation, endLocation } = req.body;
    const newTrip = new Trip({
      createdBy: req.user._id,
      allocatedDriver: driverId,
      allocatedVehicle: vehicleId,
      startLocation: {
        type: "Point",
        coordinates: [startLocation.longitude, startLocation.latitude],
      },
      endLocation: {
        type: "Point",
        coordinates: [endLocation.longitude, endLocation.latitude],
      },
      status: "in-transit",
    });
    await newTrip.save();
    res
      .status(201)
      .json({ message: "Trip created successfully", trip: newTrip });
  } catch (error) {
    res.status(500).json({ error: "Failed to create trip" });
  }
};
// get trips for company jjbh vh
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
// get allocated trip for driver
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
