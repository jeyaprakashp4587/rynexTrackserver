import mongoose from "mongoose";
import { TRIP_MODE } from "../constants/statusConst.js";
import { DB1 } from "../config/db.js";

const tripSchema = new mongoose.Schema(
  {
    tripRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripRequests",
    },

    tripMode: {
      type: String,
      enum: [
        TRIP_MODE.DISTRIBUTION,
        TRIP_MODE.RETURN_TRIP,
        TRIP_MODE.SINGLE,
        TRIP_MODE.MULTI_STOP,
      ],
      default: TRIP_MODE.SINGLE,
    },

    status: {
      type: String,
      enum: [
        TRIP_STATUS.PENDING,
        TRIP_STATUS.ACCEPTED,
        TRIP_STATUS.REJECTED,
        TRIP_STATUS.CANCELLED,
        TRIP_STATUS.EXPIRED,
        TRIP_STATUS.COMPLETED,
        TRIP_STATUS.WAITING_FOR_DRIVER,
      ],
      default: TRIP_STATUS.WAITING_FOR_DRIVER,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customer: {
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

    currentStopIndex: {
      type: Number,
      default: 0,
    },

    totalDistanceKm: Number,
    totalDurationMin: Number,

    isTripEnded: {
      type: Boolean,
      default: false,
    },

    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

const trip = DB1.model("Trip", tripSchema);
export { trip };
