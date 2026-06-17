import mongoose from "mongoose";
import { DB1 } from "../config/db.js";
import { TRIP_MODE, TRIP_STATUS, TRIP_TYPE } from "../constants/statusConst.js";

const tripRequests = new mongoose.Schema({
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
  tripType: {
    type: String,
    enum: [TRIP_TYPE.COMPANY, TRIP_TYPE.INDEPENDENT],
    default: TRIP_TYPE.INDEPENDENT,
  },
  tripMode: {
    type: String,
    enum: [
      TRIP_MODE.DISTRIBUTION,
      TRIP_MODE.SINGLE,
      TRIP_MODE.RETURN_TRIP,
      TRIP_MODE.MULTI_STOP,
    ],
    default: TRIP_MODE.SINGLE,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tripRequests.index({ createdAt: 1 });
tripRequests.index({ status: 1 });

export default DB1.model("TripRequests", tripRequests);
