import mongoose from "mongoose";
import {
  ASSIGNMENT_STATUSES,
  DEFAULT_STOP_INDEX,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";

const { ObjectId } = mongoose.Schema.Types;

export const assignmentSchema = new mongoose.Schema({
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
