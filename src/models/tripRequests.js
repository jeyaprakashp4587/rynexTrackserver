import mongoose from "mongoose";
import { DB1 } from "../config/db.js";
import { TRIP_STATUS, TRIP_TYPE } from "../constants/statusConst.js";

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
  createdBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
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

      vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },

      status: {
        type: String,
        enum: [
          TRIP_STATUS.PENDING,
          TRIP_STATUS.ACCEPTED,
          TRIP_STATUS.REJECTED,
          TRIP_STATUS.CANCELLED,
          TRIP_STATUS.TIMEOUT,
        ],
        default: TRIP_STATUS.PENDING,
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

  status: {
    type: String,
    enum: [
      TRIP_STATUS.PENDING,
      TRIP_STATUS.ACCEPTED,
      TRIP_STATUS.REJECTED,
      TRIP_STATUS.CANCELLED,
      TRIP_STATUS.EXPIRED,
    ],
    default: TRIP_STATUS.PENDING,
  },
  type: {
    type: String,
    enum: [TRIP_TYPE.COMPANY, TRIP_TYPE.INDEPENDENT],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});
tripRequests.index({ pickupCoords: "2dsphere" });
tripRequests.index({ dropCoords: "2dsphere" });
tripRequests.index({ createdAt: 1 });
tripRequests.index({ status: 1 });
export default DB1.model("TripRequests", tripRequests);
