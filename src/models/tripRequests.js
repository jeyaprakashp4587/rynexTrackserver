import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const tripRequests = new mongoose.Schema({
  pickupCoords: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  dropCoords: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  pickupLocation: {
    type: String,
    default: "Unknown",
  },
  dropLocation: {
    type: String,
    default: "Unknown",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipients: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
  ],
  requestedData: {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
    default: "PENDING",
  },
  type: {
    type: String,
    enum: ["COMPANY_TRIP", "INDEPENDENT_TRIP"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tripRequests.index({ pickupCoords: "2dsphere", dropCoords: "2dsphere" });
tripRequests.index({ createdAt: 1 });
tripRequests.index({ status: 1 });
export default DB1.model("TripRequests", tripRequests);
