import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const tripSchema = new mongoose.Schema({
  tripRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TripRequest",
    required: true,
  },
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
  status: {
    type: String,
    enum: [
      "Completed",
      "Waiting for driver",
      "Cancelled",
      "Started",
      "Accepted",
    ],
    default: "Waiting for driver",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  allocatedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  allocatedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  isTripEnded: {
    type: Boolean,
    default: false,
  },
  photoProofUrl: {
    type: String,
  },
});

tripSchema.index({ pickupCoords: "2dsphere", dropCoords: "2dsphere" });
tripSchema.index({ createdAt: 1 });
tripSchema.index({ allocatedDriver: 1 });
tripSchema.index({ allocatedVehicle: 1 });
tripSchema.index({ createdBy: 1 });
export const Trip = DB1.model("Trip", tripSchema);
