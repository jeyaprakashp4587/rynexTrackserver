import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const tripSchema = new mongoose.Schema({
  startLocation: {
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
  endLocation: {
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
    ],
    default: "unallocated",
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

export const Trip = DB1.model("Trip", tripSchema);
