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

const assignmentSchema = new mongoose.Schema({
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

const tripSchema = new mongoose.Schema(
  {
    tripRequestId: {
      type: ObjectId,
      ref: "TripRequests",
    },

    companyRouteId: {
      type: ObjectId,
      ref: "CompanyTripRoutes",
    },

    tripStopMode: {
      type: String,
      enum: Object.values(TRIP_MODE),
      default: TRIP_MODE.SINGLE,
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

    recipients: [assignmentSchema],

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

tripSchema.index(
  { tripRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { tripRequestId: { $type: "objectId" } },
  }
);
tripSchema.index({ "recipients.userId": 1, status: 1, isTripEnded: 1 });
tripSchema.index({ "recipients.assignedBy": 1, status: 1, isTripEnded: 1 });

export const trip = DB1.model("Trip", tripSchema);
