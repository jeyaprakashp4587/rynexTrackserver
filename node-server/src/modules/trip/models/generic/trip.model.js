import mongoose from "mongoose";
import {
  BSON_TYPE,
  TRIP_LIFECYCLE_STATUSES,
  TRIP_MODE,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { DB1 } from "../../../../config/db.js";
import { assignmentSchema } from "../shared/assignment.schema.js";

const { ObjectId } = mongoose.Schema.Types;

const tripSchema = new mongoose.Schema(
  {
    tripRequestId: {
      type: ObjectId,
      ref: "TripRequests",
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
    partialFilterExpression: { tripRequestId: { $type: BSON_TYPE.OBJECT_ID } },
  }
);
tripSchema.index({ "recipients.userId": 1, status: 1, isTripEnded: 1 });
tripSchema.index({ "recipients.assignedBy": 1, status: 1, isTripEnded: 1 });

export const trip = DB1.model("Trip", tripSchema);
