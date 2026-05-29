import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const tripSchema = new mongoose.Schema({
  startCoords: {
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
  // waiting for driver, unallocated , for user view status.
  // stated, completed, stain for owner view status.
  status: {
    type: String,
    enum: [
      "completed",
      "waiting for driver",
      "unallocated",
      "cancelled",
      "started",
      "accepted",
    ],
    default: "waiting for driver",
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
tripSchema.index({ startLocation: "2dsphere", endLocation: "2dsphere" });
tripSchema.index({ createdAt: 1 });
tripSchema.index({ allocatedDriver: 1 });
tripSchema.index({ allocatedVehicle: 1 });
tripSchema.index({ createdBy: 1 });
export const Trip = DB1.model("Trip", tripSchema);
