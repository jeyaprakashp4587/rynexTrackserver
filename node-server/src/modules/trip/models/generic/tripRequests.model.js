import mongoose from "mongoose";
import { DB1 } from "../../../../config/db.js";
import {
  CANDIDATE_STATUSES,
  DEFAULT_VEHICLES_REQUIRED,
  REQUEST_STATUSES,
  TRIP_MODE,
  TRIP_STATUS,
  TRIP_TYPE,
} from "../../constants/shared/trip.constants.js";

const { ObjectId } = mongoose.Schema.Types;

const candidateSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User", required: true },
  driverId: { type: ObjectId, ref: "Driver" },
  driverUserId: { type: ObjectId, ref: "User" },
  vehicleId: { type: ObjectId, ref: "Vehicle" },
  status: {
    type: String,
    enum: CANDIDATE_STATUSES,
    default: TRIP_STATUS.PENDING,
  },
  assignedBy: { type: ObjectId, ref: "User" },
  assignedAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  rejectedAt: Date,
});

const tripRequests = new mongoose.Schema({
  createdBy: [
    {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  ],

  recipients: [candidateSchema],

  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: TRIP_STATUS.PENDING,
  },

  vehiclesRequired: {
    type: Number,
    default: DEFAULT_VEHICLES_REQUIRED,
    min: 1,
  },

  acceptedCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  tripType: {
    type: String,
    enum: Object.values(TRIP_TYPE),
    default: TRIP_TYPE.INDEPENDENT,
  },
  tripStopMode: {
    type: String,
    enum: Object.values(TRIP_MODE),
    default: TRIP_MODE.SINGLE,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tripRequests.index({ createdAt: 1 });
tripRequests.index({ status: 1 });
tripRequests.index({ "recipients.userId": 1, status: 1 });
tripRequests.index({ createdBy: 1, status: 1 });

export default DB1.model("TripRequests", tripRequests);
