import mongoose from "mongoose";
import {
  BSON_TYPE,
  TRIP_LIFECYCLE_STATUSES,
  TRIP_MODE,
  TRIP_STATUS,
} from "../../constants/shared/trip.constants.js";
import { COMPANY_RUN } from "../../constants/company/company.constants.js";
import { DB1 } from "../../../../config/db.js";
import { assignmentSchema } from "../shared/assignment.schema.js";

const { ObjectId } = mongoose.Schema.Types;

const companyRunSchema = new mongoose.Schema(
  {
    companyRouteId: {
      type: ObjectId,
      ref: "CompanyTripRoutes",
      required: true,
    },

    runId: {
      type: String,
      maxlength: COMPANY_RUN.MAX_RUN_ID_LENGTH,
    },

    activeDriverUserId: { type: ObjectId, ref: "User" },
    activeVehicleId: { type: ObjectId, ref: "Vehicle" },

    tripStopMode: {
      type: String,
      enum: Object.values(TRIP_MODE),
      default: TRIP_MODE.MULTI_STOP,
    },

    status: {
      type: String,
      enum: TRIP_LIFECYCLE_STATUSES,
      default: TRIP_STATUS.ACCEPTED,
    },

    createdBy: { type: ObjectId, ref: "User", required: true },

    recipients: [assignmentSchema],

    totalDistanceKm: Number,
    totalDurationMin: Number,

    isTripEnded: { type: Boolean, default: false },

    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

companyRunSchema.index(
  { companyRouteId: 1, runId: 1 },
  {
    unique: true,
    partialFilterExpression: { runId: { $type: BSON_TYPE.STRING } },
  }
);
companyRunSchema.index(
  { activeDriverUserId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activeDriverUserId: { $type: BSON_TYPE.OBJECT_ID },
      isTripEnded: false,
    },
  }
);
companyRunSchema.index(
  { activeVehicleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      activeVehicleId: { $type: BSON_TYPE.OBJECT_ID },
      isTripEnded: false,
    },
  }
);
companyRunSchema.index({ companyRouteId: 1, startedAt: -1 });
companyRunSchema.index({ "recipients.userId": 1, isTripEnded: 1 });
companyRunSchema.index({ createdBy: 1, isTripEnded: 1 });

export const companyRun = DB1.model("CompanyRun", companyRunSchema);
