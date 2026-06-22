import mongoose from "mongoose";
import { TRIP_MODE, TRIP_STATUS } from "../constants/trip.constants.js";
import { DB1 } from "../../../config/db.js";

const tripSchema = new mongoose.Schema(
  {
    tripRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripRequests",
    },

    tripStopMode: {
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
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Driver",
        },
        currentStopIndex: {
          type: Number,
          default: 0,
        },
        vehicleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vehicle",
        },

        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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

export const trip = DB1.model("Trip", tripSchema);
