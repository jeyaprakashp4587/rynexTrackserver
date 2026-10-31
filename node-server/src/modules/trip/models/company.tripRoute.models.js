import mongoose from "mongoose";
import {
  ASSIGNMENT_STATUSES,
  DEFAULT_STOP_INDEX,
  TRIP_LIFECYCLE_STATUSES,
  TRIP_MODE,
  TRIP_STATUS,
} from "../constants/trip.constants.js";
import { DB1 } from "../../../config/db.js";

const { ObjectId } = mongoose.Schema.Types;

const standingAssignmentSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: "User" },
  driverId: { type: ObjectId, ref: "Driver" },
  driverUserId: { type: ObjectId, ref: "User" },
  vehicleId: { type: ObjectId, ref: "Vehicle" },
  status: {
    type: String,
    enum: ASSIGNMENT_STATUSES,
    default: TRIP_STATUS.PENDING,
  },
  assignedBy: { type: ObjectId, ref: "User" },
  assignedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  cancelReason: String,
  currentStopIndex: {
    type: Number,
    default: DEFAULT_STOP_INDEX,
  },
});

const companyRoutesSchema = new mongoose.Schema(
  {
    tripStopMode: {
      type: String,
      enum: [TRIP_MODE.MULTI_STOP, TRIP_MODE.SINGLE],
      default: TRIP_MODE.MULTI_STOP,
    },

    status: {
      type: String,
      enum: TRIP_LIFECYCLE_STATUSES,
      default: TRIP_STATUS.WAITING_FOR_DRIVER,
    },

    createdBy: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    recipients: [standingAssignmentSchema],

    totalDistanceKm: Number,
    totalDurationMin: Number,
    isDailyTrip: {
      type: Boolean,
      default: false,
    },
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

companyRoutesSchema.index({ createdBy: 1, isDailyTrip: 1, createdAt: -1 });
companyRoutesSchema.index({ "recipients.driverUserId": 1 });
companyRoutesSchema.index({ "recipients.userId": 1 });

export const companyRoutes = DB1.model(
  "CompanyTripRoutes",
  companyRoutesSchema
);
